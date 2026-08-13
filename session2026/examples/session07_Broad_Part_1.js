import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';

// --- Configuration ---
const CUBE_SIZE = 10;          // Le cube va de -5 à 5 sur chaque axe
const BALL_RADIUS = 0.2;
const CELL_SIZE = BALL_RADIUS * 4; // Taille de cellule ≈ 2× diamètre

let camera, scene, renderer;
let balls = [];
let grid;
let fpsDisplay = { value: 0, tests: 0 };

// --- Paramètres de Simulation ---
const simParams = {
    nbBalls: 150,
    restitution: 0.9,
    useBroadPhase: true,
    timeScale: 1.0,
    reset: function () { initSimulation(); }
};

// ============================================================
//  BROAD PHASE — SPATIAL HASHING (À COMPLÉTER)
// ============================================================

class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map(); // clé "x,y,z" -> tableau d'objets
    }

    // Convertit une position 3D en clé de cellule
    getKey(pos) {
        const x = Math.floor(pos.x / this.cellSize);
        const y = Math.floor(pos.y / this.cellSize);
        const z = Math.floor(pos.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    // Vide la grille (à appeler au début de chaque frame)
    clear() {
        this.cells.clear();
    }

    insert(obj) {
    const key = this.getKey(obj.position);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(obj);
  }
  getNeighbors(pos) {
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.cells.get(`${cx+dx},${cy+dy},${cz+dz}`);
          if (cell) neighbors.push(...cell);
        }
    return neighbors;
  }

    // --- ZONE ÉTUDIANT (A compléter) ---

    // 1. insert(obj) : ranger un objet dans la bonne cellule
    //    - Calculer la clé avec getKey(obj.position)
    //    - Si la cellule n'existe pas, la créer (tableau vide)
    //    - Ajouter l'objet au tableau de la cellule

    // 2. getNeighbors(pos) : récupérer les objets dans la cellule + les 26 voisines
    //    - Calculer les coordonnées de cellule (cx, cy, cz)
    //    - Boucler sur dx, dy, dz de -1 à +1 (27 combinaisons)
    //    - Pour chaque cellule voisine, récupérer son contenu
    //    - Retourner le tableau des voisins

    // --- FIN ZONE ÉTUDIANT ---
}

// ============================================================
//  AABB OVERLAP TEST (À COMPLÉTER)
// ============================================================

// Renvoie true si deux AABB se chevauchent sur les 3 axes
// Une AABB est définie par { min: Vector3, max: Vector3 }
function aabbOverlap(aabbA, aabbB) {
    if (a.max.x < b.min.x || b.max.x < a.min.x) return false;
    if (a.max.y < b.min.y || b.max.y < a.min.y) return false;
    if (a.max.z < b.min.z || b.max.z < a.min.z) return false;
    // [À COMPLÉTER]
    // Indice : il y a chevauchement si les intervalles se croisent sur
    // TOUS les axes (X, Y, Z). Si un seul axe ne se chevauche pas, return false.
    return true; // Par défaut : toujours collision
}

// Calcule l'AABB d'une sphère (centre + rayon)
function sphereAABB(pos, radius) {
    return {
        min: new THREE.Vector3(pos.x - radius, pos.y - radius, pos.z - radius),
        max: new THREE.Vector3(pos.x + radius, pos.y + radius, pos.z + radius)
    };
}

init();

function init() {
    // 1. Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(12, 12, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404060));

    // 2. Cube conteneur (wireframe)
    const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(cubeGeo),
        new THREE.LineBasicMaterial({ color: 0x444466 })
    );
    scene.add(wireframe);

    // 3. Grille spatiale
    grid = new SpatialGrid(CELL_SIZE);

    // 4. Simulation
    initSimulation();

    // 5. GUI
    setupGUI();

    // Controls & Loop
    new OrbitControls(camera, renderer.domElement);
    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

function setupGUI() {
    const gui = new GUI();

    const folderSim = gui.addFolder('Simulation');
    folderSim.add(simParams, 'nbBalls', 10, 3000, 10).name('Nombre de billes').onChange(initSimulation);
    folderSim.add(simParams, 'useBroadPhase').name('Broad Phase ON/OFF');
    folderSim.add(simParams, 'restitution', 0.0, 1.0, 0.05).name('Restitution (e)');
    folderSim.add(simParams, 'timeScale', 0.0, 2.0).name('⏱️ Vitesse Temps');
    gui.add(simParams, 'reset').name('♻️ RESET');

    // Affichage FPS dans la GUI
    const fpsFolder = gui.addFolder('Performance');
    fpsFolder.add(fpsDisplay, 'value').name('FPS').disable().listen();
    fpsFolder.add(fpsDisplay, 'tests').name('Tests/frame').disable().listen();
}

function initSimulation() {
    // Nettoyage
    balls.forEach(b => scene.remove(b));
    balls = [];

    for (let i = 0; i < simParams.nbBalls; i++) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(BALL_RADIUS, 16, 16),
            new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
        );
        mesh.position.set(
            (Math.random() - 0.5) * (CUBE_SIZE - 1),
            (Math.random() - 0.5) * (CUBE_SIZE - 1),
            (Math.random() - 0.5) * (CUBE_SIZE - 1)
        );
        mesh.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6
            ),
            mass: 1
        };
        balls.push(mesh);
        scene.add(mesh);
    }
}

// ============================================================
//  MOTEUR PHYSIQUE
// ============================================================

function updatePhysics(dt) {
    const half = CUBE_SIZE / 2;
    let testCount = 0;

    // 1. Intégration + murs
    for (let ball of balls) {
        ball.position.addScaledVector(ball.userData.velocity, dt);

        // Rebond sur les 6 faces du cube
        const r = BALL_RADIUS;
        if (ball.position.x > half - r) { ball.position.x = half - r; ball.userData.velocity.x *= -simParams.restitution; }
        if (ball.position.x < -half + r) { ball.position.x = -half + r; ball.userData.velocity.x *= -simParams.restitution; }
        if (ball.position.y > half - r) { ball.position.y = half - r; ball.userData.velocity.y *= -simParams.restitution; }
        if (ball.position.y < -half + r) { ball.position.y = -half + r; ball.userData.velocity.y *= -simParams.restitution; }
        if (ball.position.z > half - r) { ball.position.z = half - r; ball.userData.velocity.z *= -simParams.restitution; }
        if (ball.position.z < -half + r) { ball.position.z = -half + r; ball.userData.velocity.z *= -simParams.restitution; }
    }

    // 2. Collisions entre billes
    if (simParams.useBroadPhase) {
        // --- BROAD PHASE ---
        grid.clear();
        for (let ball of balls) grid.insert(ball);

        for (let i = 0; i < balls.length; i++) {
            const ballA = balls[i];
            const candidates = grid.getNeighbors(ballA.position);

            for (let ballB of candidates) {
                if (ballB.id <= ballA.id) continue; // Éviter les doublons
                testCount++;

                // Test AABB (filtrage supplémentaire)
                const aabbA = sphereAABB(ballA.position, BALL_RADIUS);
                const aabbB = sphereAABB(ballB.position, BALL_RADIUS);
                if (!aabbOverlap(aabbA, aabbB)) continue;

                // Narrow Phase : test sphère vs sphère
                resolveCollision(ballA, ballB);
            }
        }
    } else {
        // --- BRUTE FORCE O(N²) ---
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                testCount++;
                resolveCollision(balls[i], balls[j]);
            }
        }
    }

    fpsDisplay.tests = testCount;
}

function resolveCollision(ballA, ballB) {
    const dist = ballA.position.distanceTo(ballB.position);
    if (dist > BALL_RADIUS * 2 || dist === 0) return;

    const velA = ballA.userData.velocity;
    const velB = ballB.userData.velocity;
    const mA = ballA.userData.mass;
    const mB = ballB.userData.mass;
    const e = simParams.restitution;

    // Normale de collision
    const normal = new THREE.Vector3().subVectors(ballA.position, ballB.position).normalize();

    // Vitesse relative
    const relativeVel = new THREE.Vector3().subVectors(velA, velB);
    const vRel = relativeVel.dot(normal);
    if (vRel > 0) return; // Les objets s'éloignent

    // Impulsion
    const reducedMass = (mA * mB) / (mA + mB);
    const j = -(1 + e) * vRel * reducedMass;

    const impulse = normal.clone().multiplyScalar(j);
    velA.addScaledVector(impulse, 1 / mA);
    velB.addScaledVector(impulse, -1 / mB);

    // Correction de position
    const overlap = (BALL_RADIUS * 2) - dist;
    const correction = normal.clone().multiplyScalar(overlap / 2);
    ballA.position.add(correction);
    ballB.position.sub(correction);
}

// ============================================================
//  BOUCLE D'ANIMATION
// ============================================================

let frameCount = 0;
let lastFpsTime = performance.now();

function animate() {
    const dt = 0.016 * simParams.timeScale;
    updatePhysics(dt);
    renderer.render(scene, camera);

    // Calcul FPS (mis à jour 2x par seconde)
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime > 500) {
        fpsDisplay.value = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

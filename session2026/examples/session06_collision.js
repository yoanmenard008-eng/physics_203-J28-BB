import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
// Import de la GUI (lil-gui remplace dat.gui dans les projets modernes Three.js)
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';

// --- Configuration ---
const WALL_X = 8; 
const RADIUS = 1; 

let camera, scene, renderer;
let balls = []; 

// --- Paramètres de Simulation (L'objet qui sera lié à la GUI) ---
const simParams = {
    massA: 5.0,       // Masse Rouge
    massB: 1.0,       // Masse Verte
    timeScale: 1.0, // 1.0 = Temps réel, 0.1 = Ralenti Matrix, 0 = Pause
    velocityA: 8.0,   // Vitesse départ Rouge
    restitution: 1.0, // 1 = Elastique, 0 = Mou
    reset: function() { resetSimulation(); } // Bouton Reset
};

init();

function init() {
    // 1. Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // 2. Décors
    createWalls();

    // 3. Création des Boules (On les crée une fois, on les déplacera au Reset)
    createBall({ color: 0xff3333, mass: simParams.massA }); // Boule A (0)
    createBall({ color: 0x33ff33, mass: simParams.massB }); // Boule B (1)

    // 4. Initialisation de la position de départ
    resetSimulation();

    // 5. Mise en place de la GUI
    setupGUI();

    // Controls & Loop
    new OrbitControls(camera, renderer.domElement);
    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

function setupGUI() {
    const gui = new GUI();
    
    const folderPhys = gui.addFolder('Paramètres Physiques');
    
    // Masse A : Quand on change, on met à jour la userData de la boule directement
    folderPhys.add(simParams, 'massA', 0.1, 20.0, 0.1)
        .name('Masse Rouge (A)')
        .onChange(v => balls[0].userData.mass = v);

    // Masse B
    folderPhys.add(simParams, 'massB', 0.1, 20.0, 0.1)
        .name('Masse Verte (B)')
        .onChange(v => balls[1].userData.mass = v);

    // Restitution
    folderPhys.add(simParams, 'restitution', 0.0, 1.2, 0.1)
        .name('Restitution (e)');

    const folderInit = gui.addFolder('Conditions Initiales');
    folderInit.add(simParams, 'velocityA', 0, 20, 0.5).name('Vitesse A').onChange(resetSimulation);
    gui.add(simParams, 'timeScale', 0.0, 2.0).name('⏱️ Vitesse Temps');
    gui.add(simParams, 'reset').name("♻️ RESET");
}

function resetSimulation() {
    // On remet tout à zéro
    
    // Boule A (Rouge) : Gauche, vitesse vers la droite
    const ballA = balls[0];
    ballA.position.set(-5, 1, 0);
    ballA.userData.velocity.set(simParams.velocityA, 0, 0);
    ballA.userData.mass = simParams.massA; // Sûreté

    // Boule B (Verte) : Droite, immobile
    const ballB = balls[1];
    ballB.position.set(0, 1, 0); // Au centre
    ballB.userData.velocity.set(0, 0, 0);
    ballB.userData.mass = simParams.massB;
}

function createWalls() {
    const geo = new THREE.BoxGeometry(1, 4, 10);
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const wallL = new THREE.Mesh(geo, mat); wallL.position.set(-WALL_X - 0.5, 2, 0); scene.add(wallL);
    const wallR = new THREE.Mesh(geo, mat); wallR.position.set(WALL_X + 0.5, 2, 0); scene.add(wallR);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    floor.rotation.x = -Math.PI/2; scene.add(floor);
}

function createBall(params) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS, 32, 32),
        new THREE.MeshStandardMaterial({ color: params.color })
    );
    mesh.castShadow = true;
    scene.add(mesh);
    
    mesh.userData = {
        velocity: new THREE.Vector3(), // Sera défini par le reset
        mass: params.mass
    };
    balls.push(mesh);
}

// --- MOTEUR PHYSIQUE ---
function updatePhysics(dt) {
    // 1. Mouvement
    for (let ball of balls) {
        ball.position.addScaledVector(ball.userData.velocity, dt);
    }

    // 2. Murs
    for (let ball of balls) {
        if (ball.position.x > WALL_X - RADIUS) {
            ball.position.x = WALL_X - RADIUS;
            ball.userData.velocity.x *= -1;
        } else if (ball.position.x < -WALL_X + RADIUS) {
            ball.position.x = -WALL_X + RADIUS;
            ball.userData.velocity.x *= -1;
        }
    }

    // 3. Collisions Boules
    // Note : il n'y a que 2 boules pour ce TP
    if(balls.length >= 2) {
        resolveBallCollision(balls[0], balls[1]);
    }
}

function resolveBallCollision(ballA, ballB) {
    const dist = ballA.position.distanceTo(ballB.position);
    if (dist > RADIUS * 2) return;

    // --- ZONE ÉTUDIANT (A compléter) ---
    const velA = ballA.userData.velocity;
    const velB = ballB.userData.velocity;
    const mA = ballA.userData.mass;
    const mB = ballB.userData.mass;
    
    // On récupère 'e' depuis la GUI
    const e = simParams.restitution; 

    // 1. Normale & Vitesse Relative
    const normal = new THREE.Vector3().subVectors(ballA.position, ballB.position).normalize();
    const relativeVel = new THREE.Vector3().subVectors(velA, velB);
    const vRel = relativeVel.dot(normal);

    if (vRel > 0) return;

    // 2. Impulsion (Formule du cours)
    // const reducedMass = ??;
    const reducedMass = (mA*mB)/(mA+mB);
    // const j = ??;
    const j = (-(1+e)*vRel)*reducedMass;

    // 3. Application
     const impulse = j;
     velA.addScaledVector(impulse, 1 / mA);
     velB.addScaledVector(impulse, -1 / mB);
    // --- FIN ZONE ÉTUDIANT ---

    // Correction Position
    const overlap = (RADIUS * 2) - dist;
    const correction = normal.clone().multiplyScalar(overlap / 2);
    ballA.position.add(correction);
    ballB.position.sub(correction);
}

function animate() {
    const dt = 0.016 * simParams.timeScale;
    updatePhysics(dt);
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
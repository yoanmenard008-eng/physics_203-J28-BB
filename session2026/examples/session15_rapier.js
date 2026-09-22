import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';
import RAPIER from 'rapier';

// ============================================================
//  SESSION 15 — Three.js + Rapier : Joint Zoo
//
//  Quatre stations, une par concept, côte à côte :
//    1. BERCE DE NEWTON → Revolute joints (5 balles, pas de moteur)
//    2. PISTON         → Prismatic joint (pousse une boîte + moteur)
//    3. CHAÎNE         → Spherical joints (4 maillons, rotule libre)
//    4. CAPTEUR RAYCAST → Raycast (rayon tournant + marqueurs d'impact)
//
//  Chaque station est indépendante et stable : pas de collision
//  entre corps articulés (setContactsEnabled(false) sur les joints).
// ============================================================

const params = {
    gravity: -9.81,
    autoLoop: true,             // les stations tournent en boucle
    cradlePull: pullCradle,
    cradleAngle: 45,          // degrés d'écartement
    pistonMotor: true,
    pistonSpeed: 2.0,         // m/s cible
    pistonStiffness: 200,
    pistonLimit: 2.0,        // mètres de course
    chainSwing: false,
    raycastSpeed: 1.0,        // tours/s du rayon
    raycastMaxDist: 15.0,
    reset: resetScene,
    pause: false,
};

const FIXED_DT = 1 / 60;

let scene, camera, renderer, controls;
let world;
let pairs = [];          // { mesh, body } — lien rendu ↔ physique
let accumulator = 0;
const timer = new THREE.Timer();

// --- Les quatre stations ---
// 1. Newton's cradle
let cradleBodies = [], cradleMeshes = [], cradleJoints = [];
let cradleStringMeshes = [];  // les fils visuels (à mettre à jour chaque frame)
let cradleAnchorBody;
let cradleTimer = 0;          // auto-pull timer
let cradleAutoPull = true;    // auto-loop
// 2. Piston
let pistonJoint, pistonBody, pistonMesh;
let boxBody, boxMesh;
let pistonDir = 1;            // direction actuelle (oscille)
let pistonTimer = 0;          // timer pour repousser la boîte
// 3. Chain
let chainBodies = [], chainMeshes = [], chainJoints = [];
let chainTimer = 0;           // auto-push timer
// 4. Raycast
let rayOrigin, rayMesh, hitMarkerMesh;
let rayAngle = 0;
let raycastHitDist = -1;

// ============================================================
//  INITIALISATION
// ============================================================
async function init() {
    await RAPIER.init({});

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 6, 22);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // --- Lumières ---
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -5;
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x8899bb, 0x332211, 0.5));

    // --- Le monde physique ---
    world = new RAPIER.World({ x: 0, y: params.gravity, z: 0 });
    world.timestep = FIXED_DT;

    createGround();
    createCradle();
    createPiston();
    createChain();
    createRaycastStation();
    setupGUI();

    // Démarrer la boucle : tirer la première balle du berceau
    pullCradle();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 3, 0);
    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

// ============================================================
//  LE SOL
// ============================================================
function createGround() {
    const grid = new THREE.TextureLoader().load('./textures/grid.png');
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(20, 20);
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(60, 0.2, 60),
        new THREE.MeshStandardMaterial({ map: grid, roughness: 0.9 })
    );
    mesh.position.y = -0.1;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(30, 0.1, 30).setFriction(0.8),
        body
    );
}

// ============================================================
//  STATION 1 : BERCE DE NEWTON — Revolute Joints
//  5 balles suspendues à un support. Pas de moteur : les balles
//  oscillent librement. Tirer la première → l'énergie traverse
//  la rangée et la dernière s'envole.
// ============================================================
function createCradle() {
    const CRADLE_X = -8;
    const CRADLE_Y = 5;        // hauteur du support
    const BALL_R = 0.35;
    const BALL_GAP = 0.72;     // ~2× radius (les balles se touchent)
    const STRING_LEN = 2.5;
    const BALL_COUNT = 5;

    // --- Support fixe (barre horizontale) ---
    const barMesh = new THREE.Mesh(
        new THREE.BoxGeometry(BALL_COUNT * BALL_GAP + 0.6, 0.15, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.5 })
    );
    barMesh.position.set(CRADLE_X, CRADLE_Y, 0);
    barMesh.castShadow = barMesh.receiveShadow = true;
    scene.add(barMesh);

    // Deux piliers verticaux
    for (const dx of [-(BALL_COUNT * BALL_GAP + 0.6) / 2, (BALL_COUNT * BALL_GAP + 0.6) / 2]) {
        const postMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, CRADLE_Y, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
        );
        postMesh.position.set(CRADLE_X + dx, CRADLE_Y / 2, 0);
        postMesh.castShadow = true;
        scene.add(postMesh);
    }

    cradleAnchorBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(CRADLE_X, CRADLE_Y, 0)
    );

    // --- Les 5 balles ---
    for (let i = 0; i < BALL_COUNT; i++) {
        const x = CRADLE_X + (i - (BALL_COUNT - 1) / 2) * BALL_GAP;
        const ballY = CRADLE_Y - STRING_LEN;

        // --- Rendu : fil + balle ---
        const ballMesh = new THREE.Mesh(
            new THREE.SphereGeometry(BALL_R, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.15, metalness: 0.9 })
        );
        ballMesh.castShadow = true;
        scene.add(ballMesh);

        // Fil (visuel, pas de physique) — mis à jour chaque frame
        const stringGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, CRADLE_Y, 0),
            new THREE.Vector3(x, ballY, 0)
        ]);
        const stringMesh = new THREE.Line(stringGeo,
            new THREE.LineBasicMaterial({ color: 0x888888 }));
        scene.add(stringMesh);
        cradleStringMeshes.push(stringMesh);

        // --- Physique : balle dynamique ---
        const ballBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(x, ballY, 0)
                .setAngularDamping(0.1)
                .setLinearDamping(0.05)
        );
        world.createCollider(
            RAPIER.ColliderDesc.ball(BALL_R)
                .setDensity(3.0)     // lourd — comme l'acier
                .setRestitution(0.95), // quasi-élastique
            ballBody
        );

        pairs.push({ mesh: ballMesh, body: ballBody });
        cradleBodies.push(ballBody);
        cradleMeshes.push(ballMesh);

        // --- JOINT REVOLUTE : balle suspendue au support ---
        // Ancre sur le support : (x relatif, 0, 0) — en bas de la barre
        // Ancre sur la balle : (0, STRING_LEN, 0) — en haut de la balle
        const joint = world.createImpulseJoint(
            RAPIER.JointData.revolute(
                { x: (i - (BALL_COUNT - 1) / 2) * BALL_GAP, y: 0, z: 0 },
                { x: 0, y: STRING_LEN, z: 0 },
                { x: 0, y: 0, z: 1 }   // axe Z = pendule avant/arrière
            ),
            cradleAnchorBody, ballBody, true
        );
        joint.setContactsEnabled(false);
        cradleJoints.push(joint);
    }
}

// --- Tirer la première balle du berceau ---
function pullCradle() {
    if (cradleBodies.length === 0) return;
    const angle = params.cradleAngle * Math.PI / 180;
    const ball = cradleBodies[0];
    const STRING_LEN = 2.5;
    // Téléporter la balle à l'angle voulu (vers la gauche)
    const anchorX = -8 + (0 - 2) * 0.72;  // première balle
    const anchorY = 5;
    const newX = anchorX - Math.sin(angle) * STRING_LEN;
    const newY = anchorY - Math.cos(angle) * STRING_LEN;
    ball.setTranslation({ x: newX, y: newY, z: 0 }, true);
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true);
    ball.wakeUp();
}

// --- Mettre à jour les fils du berceau : du support à la balle ---
function updateCradleStrings() {
    const CRADLE_Y = 5;
    for (let i = 0; i < cradleStringMeshes.length; i++) {
        const ball = cradleBodies[i];
        if (!ball) continue;
        const t = ball.translation();
        const pos = cradleStringMeshes[i].geometry.attributes.position.array;
        // Top: ancre fixe sur le support (X varie par balle)
        const anchorX = -8 + (i - 2) * 0.72;
        pos[0] = anchorX; pos[1] = CRADLE_Y; pos[2] = 0;
        // Bottom: centre de la balle
        pos[3] = t.x; pos[4] = t.y; pos[5] = t.z;
        cradleStringMeshes[i].geometry.attributes.position.needsUpdate = true;
    }
}

// ============================================================
//  STATION 2 : LE PISTON — Prismatic Joint
//  Une seule pente inclinée. Le piston glisse sur la pente et
//  pousse la boîte vers le haut. La boîte redescend par gravité.
//  Moteur en vitesse + limites. La boîte est un corps libre.
// ============================================================
function createPiston() {
    const SLOPE_ANGLE = 20 * Math.PI / 180;
    const cos = Math.cos(SLOPE_ANGLE);
    const sin = Math.sin(SLOPE_ANGLE);
    const SLOPE_CX = -2;       // centre de la pente (monde)
    const SLOPE_CY = 2;
    const SLOPE_LEN = 6.0;
    const SLOPE_THICK = 0.3;
    const SURFACE_Y = SLOPE_THICK / 2;  // surface supérieure de la pente (local)

    const slopeQuat = {
        x: 0, y: 0,
        z: Math.sin(SLOPE_ANGLE / 2),
        w: Math.cos(SLOPE_ANGLE / 2)
    };

    // --- Convertir un point local de la pente → monde ---
    function slopeToWorld(lx, ly) {
        return {
            x: SLOPE_CX + lx * cos - ly * sin,
            y: SLOPE_CY + lx * sin + ly * cos
        };
    }

    // --- La pente (un seul bloc fixe incliné) ---
    const slopeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(SLOPE_LEN, SLOPE_THICK, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
    );
    slopeMesh.position.set(SLOPE_CX, SLOPE_CY, 0);
    slopeMesh.rotation.z = SLOPE_ANGLE;
    slopeMesh.castShadow = slopeMesh.receiveShadow = true;
    scene.add(slopeMesh);

    const slopeBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
            .setTranslation(SLOPE_CX, SLOPE_CY, 0)
            .setRotation(slopeQuat)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(SLOPE_LEN / 2, SLOPE_THICK / 2, 0.5)
            .setFriction(0.4),  // peu de friction — la boîte glisse
        slopeBody
    );

    // --- Le piston (dynamique, glisse le long de la pente) ---
    pistonMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.5 })
    );
    pistonMesh.castShadow = true;
    scene.add(pistonMesh);

    // Position initiale : bas de la pente, sur la surface
    const PISTON_LX = -2.0;   // local X sur la pente (bas)
    const PISTON_LY = SURFACE_Y + 0.35;  // sur la surface + demi-hauteur
    const pistonPos = slopeToWorld(PISTON_LX, PISTON_LY);

    pistonBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(pistonPos.x, pistonPos.y, 0)
            .setRotation(slopeQuat)       // aligné avec la pente
            .setAngularDamping(5.0)
            .setLinearDamping(0.5)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.3, 0.35, 0.35)
            .setDensity(2.0)
            .setFriction(0.3),
        pistonBody
    );

    pairs.push({ mesh: pistonMesh, body: pistonBody });

    // --- LE JOINT PRISMATIC le long de la pente ---
    // L'axe X local du slopeBody = direction de la pente (inclinée à 20°)
    pistonJoint = world.createImpulseJoint(
        RAPIER.JointData.prismatic(
            { x: PISTON_LX, y: PISTON_LY, z: 0 },  // ancre sur la pente (local)
            { x: 0, y: 0, z: 0 },                 // ancre sur le piston (local)
            { x: 1, y: 0, z: 0 }                  // axe X local = direction de la pente
        ),
        slopeBody, pistonBody, true
    );
    pistonJoint.setContactsEnabled(false);

    applyPistonLimits();
    applyPistonMotor();

    // --- La boîte à pousser (corps libre, pas de joint) ---
    boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.5 })
    );
    boxMesh.castShadow = true;
    scene.add(boxMesh);

    // Position initiale : juste au-dessus du piston, sur la surface
    const BOX_LX = -1.0;
    const BOX_LY = SURFACE_Y + 0.35;
    const boxPos = slopeToWorld(BOX_LX, BOX_LY);

    boxBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(boxPos.x, boxPos.y, 0)
            .setRotation(slopeQuat)
            .setAngularDamping(0.3)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.35, 0.35, 0.35)
            .setDensity(1.0)
            .setFriction(0.01)    // glissant comme la pente
            .setRestitution(0.1),
        boxBody
    );

    pairs.push({ mesh: boxMesh, body: boxBody });
}

function applyPistonLimits() {
    pistonJoint.setLimits(-0.5, params.pistonLimit);
}

function applyPistonMotor() {
    if (params.pistonMotor) {
        pistonJoint.configureMotorVelocity(
            params.pistonSpeed,
            params.pistonStiffness
        );
    } else {
        pistonJoint.configureMotorVelocity(0, 0);
    }
}

// ============================================================
//  STATION 3 : LA CHAÎNE — Spherical Joints
//  4 maillons reliés par des rotules. Tombent et oscillent librement.
// ============================================================
function createChain() {
    const CHAIN_X = 4;
    const CHAIN_TOP = 6;
    const LINK_COUNT = 4;
    const LINK_SIZE = 0.5;
    const LINK_GAP = 0.6;

    // --- Point d'attache fixe (anneau au plafond) ---
    const anchorMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.08, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 })
    );
    anchorMesh.position.set(CHAIN_X, CHAIN_TOP, 0);
    anchorMesh.castShadow = true;
    scene.add(anchorMesh);

    const anchorBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(CHAIN_X, CHAIN_TOP, 0)
    );
    world.createCollider(
        RAPIER.ColliderDesc.ball(0.3),
        anchorBody
    );

    let prevBody = anchorBody;
    let prevAnchor = { x: 0, y: -0.3, z: 0 }; // bas de l'anneau

    for (let i = 0; i < LINK_COUNT; i++) {
        const y = CHAIN_TOP - (i + 1) * LINK_GAP;

        const linkMesh = new THREE.Mesh(
            new THREE.SphereGeometry(LINK_SIZE / 2, 16, 16),
            new THREE.MeshStandardMaterial({
                color: [0xf1c40f, 0xe67e22, 0x2ecc71, 0x9b59b6][i],
                roughness: 0.5, metalness: 0.3
            })
        );
        linkMesh.castShadow = true;
        scene.add(linkMesh);

        const linkBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(CHAIN_X, y, 0)
                .setAngularDamping(0.3)
                .setLinearDamping(0.1)
        );
        world.createCollider(
            RAPIER.ColliderDesc.ball(LINK_SIZE / 2)
                .setDensity(1.0)
                .setRestitution(0.3),
            linkBody
        );

        pairs.push({ mesh: linkMesh, body: linkBody });
        chainBodies.push(linkBody);
        chainMeshes.push(linkMesh);

        // --- JOINT SPHERICAL entre ce maillon et le précédent ---
        const joint = world.createImpulseJoint(
            RAPIER.JointData.spherical(
                prevAnchor,                    // ancre sur le corps précédent
                { x: 0, y: LINK_SIZE / 2, z: 0 } // ancre sur ce maillon (haut)
            ),
            prevBody, linkBody, true
        );
        joint.setContactsEnabled(false);
        chainJoints.push(joint);

        prevBody = linkBody;
        prevAnchor = { x: 0, y: -LINK_SIZE / 2, z: 0 }; // bas du maillon
    }
}

// ============================================================
//  STATION 4 : CAPTEUR RAYCAST
//  Un rayon tourne depuis un point élevé. À chaque frame, on
//  raycaste dans la direction courante et on place un marqueur
//  au point d'impact. Démontre : castRay, timeOfImpact, normal.
// ============================================================
function createRaycastStation() {
    const RAY_X = 10;
    const RAY_Y = 5;

    rayOrigin = { x: RAY_X, y: RAY_Y, z: 0 };

    // --- Émetteur visuel (petite sphère) ---
    const emitterMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 })
    );
    emitterMesh.position.set(RAY_X, RAY_Y, 0);
    scene.add(emitterMesh);

    // --- Le rayon visuel (ligne) ---
    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    rayMesh = new THREE.Line(rayGeo,
        new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 }));
    scene.add(rayMesh);

    // --- Marqueur d'impact (sphère rouge) ---
    hitMarkerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 })
    );
    hitMarkerMesh.visible = false;
    scene.add(hitMarkerMesh);

    // --- Mur de cibles pour le rayon (grille dans le plan YZ, face à l'émetteur) ---
    const WALL_CX = RAY_X + 5;   // distance de l'émetteur (constante pour toute la grille)
    const WALL_CY = 2.5;
    const WALL_CZ = 0;
    const COLS = 5, ROWS = 4;    // colonnes en Z, lignes en Y
    const CELL = 0.6;
    const CUBE = 0.4;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const x = WALL_CX;                                    // tous à la même profondeur
            const y = WALL_CY + (row - (ROWS - 1) / 2) * CELL;   // lignes : vertical
            const z = WALL_CZ + (col - (COLS - 1) / 2) * CELL;    // colonnes : horizontal (Z)

            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(CUBE, CUBE, CUBE),
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 })
            );
            mesh.position.set(x, y, z);
            mesh.castShadow = mesh.receiveShadow = true;
            scene.add(mesh);

            const body = world.createRigidBody(
                RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)
            );
            world.createCollider(
                RAPIER.ColliderDesc.cuboid(CUBE / 2, CUBE / 2, CUBE / 2),
                body
            );
        }
    }

    // --- Un obstacle bas (le sol sert déjà, ajoutons un bloc au sol) ---
    const blockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
    );
    blockMesh.position.set(RAY_X, 0.25, 0);
    blockMesh.receiveShadow = true;
    scene.add(blockMesh);

    const blockBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(RAY_X, 0.25, 0)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(1, 0.25, 1),
        blockBody
    );
}

function updateRaycast() {
    // Le rayon balaie verticalement (Y) et horizontalement (Z) pour scanner le mur
    rayAngle += params.raycastSpeed * FIXED_DT;
    const verticalSweep = Math.sin(rayAngle * 2) * 0.5;      // Y : -0.5 à +0.5
    const horizontalSweep = Math.sin(rayAngle * 0.7) * 0.5;  // Z : -0.5 à +0.5

    // Direction : principalement vers +X (le mur), avec balayage Y et Z
    const dir = {
        x: 1,
        y: verticalSweep,
        z: horizontalSweep
    };
    // Normaliser
    const len = Math.hypot(dir.x, dir.y, dir.z);
    dir.x /= len; dir.y /= len; dir.z /= len;

    // --- LE RAYCAST ---
    const ray = new RAPIER.Ray(rayOrigin, dir);
    const hit = world.castRay(ray, params.raycastMaxDist, true);

    if (hit) {
        const point = ray.pointAt(hit.timeOfImpact);
        // Mettre à jour le rayon visuel
        setLine(rayMesh, rayOrigin, point);
        // Marqueur d'impact
        hitMarkerMesh.position.set(point.x, point.y, point.z);
        hitMarkerMesh.visible = true;
        // Stocker la distance pour le HUD
        raycastHitDist = hit.timeOfImpact;
    } else {
        // Pas de hit : rayon à la distance max
        const end = {
            x: rayOrigin.x + dir.x * params.raycastMaxDist,
            y: rayOrigin.y + dir.y * params.raycastMaxDist,
            z: rayOrigin.z + dir.z * params.raycastMaxDist
        };
        setLine(rayMesh, rayOrigin, end);
        hitMarkerMesh.visible = false;
        raycastHitDist = -1;
    }
}

function setLine(line, start, end) {
    const pos = line.geometry.attributes.position.array;
    pos[0] = start.x; pos[1] = start.y; pos[2] = start.z;
    pos[3] = end.x;   pos[4] = end.y;   pos[5] = end.z;
    line.geometry.attributes.position.needsUpdate = true;
}

// ============================================================
//  LA BOUCLE
// ============================================================
function animate() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);

    if (!params.pause) {
        accumulator += dt;
        while (accumulator >= FIXED_DT) {
            world.step();
            accumulator -= FIXED_DT;
        }

        // --- Auto-loop des stations ---
        updateAutoLoops(dt);
    }

    // --- Synchronisation rendu ← physique ---
    for (const { mesh, body } of pairs) {
        const t = body.translation();
        const r = body.rotation();
        mesh.position.set(t.x, t.y, t.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    // --- Mise à jour des fils du berceau (station 1) ---
    updateCradleStrings();

    // --- Raycast (station 4) ---
    updateRaycast();

    updateHUD();
    renderer.render(scene, camera);
}

// ============================================================
//  AUTO-LOOP — les stations tournent en boucle
// ============================================================
function updateAutoLoops(dt) {
    if (!params.autoLoop) return;

    // --- 1. Cradle : re-tirer quand les balles s'arrêtent ---
    if (cradleBodies.length > 0) {
        cradleTimer += dt;
        if (cradleTimer > 3.0) {
            // Vérifier si les balles sont quasi-immobiles
            let totalSpeed = 0;
            for (const b of cradleBodies) {
                const v = b.linvel();
                totalSpeed += Math.hypot(v.x, v.y, v.z);
            }
            if (totalSpeed < 0.5) {
                pullCradle();
                cradleTimer = 0;
            }
        }
    }

    // --- 2. Piston : pousser puis retracter (osciller) ---
    if (params.pistonMotor && pistonJoint) {
        pistonTimer += dt;
        if (pistonTimer > 2.0) {
            pistonDir *= -1;
            pistonJoint.configureMotorVelocity(
                params.pistonSpeed * pistonDir,
                params.pistonStiffness
            );
            pistonTimer = 0;
        }
        // Reset la boîte si elle tombe ou sort de la pente
        if (boxBody) {
            const bp = boxBody.translation();
            if (bp.y < 0.5 || bp.x > 3 || bp.x < -6) {
                // Position de départ sur la pente (local -1, 0.5)
                const a = 20 * Math.PI / 180;
                const bx = -2 + (-1) * Math.cos(a) - 0.5 * Math.sin(a);
                const by = 2 + (-1) * Math.sin(a) + 0.5 * Math.cos(a);
                const sq = { x: 0, y: 0, z: Math.sin(a/2), w: Math.cos(a/2) };
                boxBody.setTranslation({ x: bx, y: by, z: 0 }, true);
                boxBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
                boxBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
                boxBody.setRotation(sq, true);
            }
        }
    }

    // --- 3. Chaîne : pousser périodiquement ---
    if (chainBodies.length > 0) {
        chainTimer += dt;
        if (chainTimer > 4.0) {
            for (const b of chainBodies) {
                b.applyImpulse({ x: 3, y: 2, z: 0 }, true);
            }
            chainTimer = 0;
        }
    }
}

// ============================================================
//  HUD
// ============================================================
function updateHUD() {
    let text = 'Joint Zoo — 4 stations\n';
    text += `1. Newton: ${cradleBodies.length} balles | `;
    text += `2. Piston: ${params.pistonMotor ? 'moteur ON' : 'libre'} | `;
    text += `3. Chaîne: ${chainBodies.length} maillons | `;
    text += `4. Raycast: ${raycastHitDist >= 0 ? raycastHitDist.toFixed(2) + ' m' : '—'}`;
    document.getElementById('hud').textContent = text;
}

// ============================================================
//  RESET
// ============================================================
function resetScene() {
    // Supprimer tous les bodies et meshes dynamiques
    for (const p of [...pairs]) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        world.removeRigidBody(p.body);
    }
    pairs = [];
    cradleBodies = []; cradleMeshes = []; cradleJoints = [];
    // Supprimer aussi les fils visuels
    for (const s of cradleStringMeshes) {
        scene.remove(s);
        s.geometry.dispose();
        s.material.dispose();
    }
    cradleStringMeshes = [];
    chainBodies = []; chainMeshes = []; chainJoints = [];
    pistonJoint = null;

    // Recréer les stations
    createCradle();
    createPiston();
    createChain();
    accumulator = 0;
    cradleTimer = 0;
    pistonTimer = 0;
    pistonDir = 1;
    chainTimer = 0;
}

// ============================================================
//  GUI
// ============================================================
function setupGUI() {
    const gui = new GUI();

    gui.add(params, 'autoLoop').name('🔄 Boucle auto');

    const cradleFolder = gui.addFolder('1. Newton (Revolute)');
    cradleFolder.add(params, 'cradleAngle', 10, 80, 1).name('Angle de tir (°)');
    cradleFolder.add(params, 'cradlePull').name('🎯 Tirer la 1re balle');

    const pistonFolder = gui.addFolder('2. Piston (Prismatic)');
    pistonFolder.add(params, 'pistonMotor').name('Moteur ON').onChange(applyPistonMotor);
    pistonFolder.add(params, 'pistonSpeed', -5, 5, 0.1).name('Vitesse (m/s)').onChange(applyPistonMotor);
    pistonFolder.add(params, 'pistonStiffness', 0, 1000, 10).name('Force').onChange(applyPistonMotor);
    pistonFolder.add(params, 'pistonLimit', 0.5, 4, 0.1).name('Limite (m)').onChange(applyPistonLimits);

    const chainFolder = gui.addFolder('3. Chaîne (Spherical)');
    chainFolder.add(params, 'chainSwing').name('Pousser la chaîne').onChange(() => {
        if (params.chainSwing) {
            for (const b of chainBodies) {
                b.applyImpulse({ x: 5, y: 0, z: 0 }, true);
            }
            params.chainSwing = false;
        }
    });

    const rayFolder = gui.addFolder('4. Raycast');
    rayFolder.add(params, 'raycastSpeed', 0, 3, 0.1).name('Vitesse de rotation (tr/s)');
    rayFolder.add(params, 'raycastMaxDist', 5, 30, 1).name('Distance max (m)');

    const worldFolder = gui.addFolder('Monde');
    worldFolder.add(params, 'gravity', -20, 0, 0.1).name('⚖️ Gravité Y').onChange(v => {
        world.gravity = { x: 0, y: v, z: 0 };
        for (const { body } of pairs) body.wakeUp();
    });
    worldFolder.add(params, 'pause').name('⏸️ Pause');
    worldFolder.add(params, 'reset').name('♻️ Reset');
}

// ============================================================
//  RESIZE
// ============================================================
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
//  GO
// ============================================================
init().catch(err => {
    document.getElementById('hud').textContent =
        'Erreur de chargement de Rapier (WASM) : ' + err.message;
    console.error(err);
});

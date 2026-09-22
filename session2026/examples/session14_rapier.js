import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';
import RAPIER from 'rapier';

// ============================================================
//  SESSION 14 — Three.js + Rapier (moteur physique commercial)
//
//  Comparez avec les sessions précédentes : PLUS UNE SEULE
//  ligne d'intégration, de détection de collision ou d'impulsion.
//  On crée des corps, world.step() fait le reste, et on
//  synchronise les meshes sur les positions du moteur.
// ============================================================

const params = {
    gravity: -9.81,
    cannonSpeed: 60,        // vitesse du boulet (units/s)
    ccd: true,              // Continuous Collision Detection
    restitution: 0.3,       // rebond des matériaux
    friction: 0.7,          // friction des matériaux
    pause: false,
    reset: resetScene,
};

const FIXED_DT = 1 / 60;    // physique à pas fixe (pattern de la Session 5)

let scene, camera, renderer, controls;
let world;                          // le monde Rapier
let pairs = [];                     // { mesh, body } — le lien rendu ↔ physique
let accumulator = 0;
const clock = new THREE.Clock();

// ============================================================
//  INITIALISATION
// ============================================================
async function init() {
    // --- La seule étape "exotique" : charger le WASM ---
    // Rapier est écrit en Rust et compilé en WebAssembly.
    // Le chargement est asynchrone — on ne peut rien créer avant.
    await RAPIER.init();

    // --- Scène Three.js (classique) ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(14, 9, 18);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // --- Lumières ---
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    dirLight.position.set(12, 18, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x8899bb, 0x332211, 0.5));

    // --- LE MONDE PHYSIQUE ---
    // Équivalent de notre "univers" maison : gravité + registre de corps.
    world = new RAPIER.World({ x: 0, y: params.gravity, z: 0 });
    world.timestep = FIXED_DT;

    createGround();
    createStack();
    setupGUI();
    setupClick();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 3, 0);
    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

// ============================================================
//  LE SOL — corps FIXE (masse infinie, jamais simulé)
// ============================================================
function createGround() {
    // --- Rendu : mesh Three.js avec la texture grille du cours ---
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

    // --- Physique : FIXED rigid body + collider cuboïde ---
    // NB : le cuboïde Rapier prend des DEMI-dimensions (half-extents).
    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
    );
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(30, 0.1, 30)
            .setFriction(params.friction)
            .setRestitution(params.restitution),
        body
    );
}

// ============================================================
//  L'EMPILEMENT — corps DYNAMIQUES (le moteur fait tout)
// ============================================================
function createStack() {
    // Une pyramide façon "bowling" : 5 étages, chaque étage une boîte de moins
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const colors = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6];
    const zBase = 0;

    for (let row = 0; row < 5; row++) {
        const count = 5 - row;
        for (let i = 0; i < count; i++) {
            const x = (i - (count - 1) / 2) * 1.05;
            const y = 0.5 + row * 1.05;

            // --- Rendu ---
            const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
                color: colors[row % colors.length], roughness: 0.6, metalness: 0.1
            }));
            mesh.castShadow = mesh.receiveShadow = true;
            scene.add(mesh);

            // --- Physique : DYNAMIC rigid body + collider ---
            const body = world.createRigidBody(
                RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, zBase)
            );
            world.createCollider(
                RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
                    .setFriction(params.friction)
                    .setRestitution(params.restitution),
                body
            );

            // Le lien croisé — la physique est la SOURCE DE VÉRITÉ
            pairs.push({ mesh, body });
        }
    }

    // Une sphère témoin qui roule au sol
    addBody(
        new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0x1abc9c, roughness: 0.3, metalness: 0.4 })
        ),
        RAPIER.RigidBodyDesc.dynamic().setTranslation(6, 0.7, 2)
            .setLinvel(-4, 0, 0),
        RAPIER.ColliderDesc.ball(0.7)
            .setFriction(params.friction)
            .setRestitution(params.restitution)
    );
}

// ============================================================
//  CLIC → BOULET DE CANON (démo du CCD / tunneling)
// ============================================================
function setupClick() {
    renderer.domElement.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;

        // Raycast écran → direction de tir (du calcul Three.js pur)
        const ndc = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);

        // Le boulet part de la caméra vers le point cliqué
        const dir = raycaster.ray.direction.clone().normalize();
        fireCannonball(raycaster.ray.origin, dir);
    });
}

function fireCannonball(origin, dir) {
    // --- Rendu : une sphère métallique ---
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.25, metalness: 0.9 })
    );
    mesh.castShadow = true;
    scene.add(mesh);

    // --- Physique : dynamique, DENSE, et... CCD activé ? ---
    // setCcdEnabled(true) = le moteur teste la trajectoire ENTIRE
    // entre deux pas (Partie 2 du cours) au lieu des positions seules.
    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(origin.x, origin.y, origin.z)
            .setCcdEnabled(params.ccd)
    );
    world.createCollider(
        RAPIER.ColliderDesc.ball(0.45)
            .setDensity(10)   // lourd — 10x la densité par défaut
            .setRestitution(params.restitution * 0.5),
        body
    );

    // L'impulsion : une seule ligne. Rappelez-vous Session 6 —
    // ici, pas besoin de calculer J à la main, le solveur s'en charge.
    body.applyImpulse(
        { x: dir.x * params.cannonSpeed, y: dir.y * params.cannonSpeed, z: dir.z * params.cannonSpeed },
        true   // true = réveille le corps
    );

    pairs.push({ mesh, body });

    // Ménage : on limite le nombre de boulets pour la performance
    // (un moteur commercial gère des milliers de corps — nous, on rationne)
    const cannonballs = pairs.filter(p => p.body.collider(0) &&
        p.body.collider(0).shape.type === RAPIER.ShapeType.Ball && p.mesh.geometry.parameters.radius < 0.5);
    if (cannonballs.length > 12) {
        const old = cannonballs[0];
        removePair(old);
    }
}

// ============================================================
//  LA BOUCLE — step() puis synchronisation
// ============================================================
function animate() {
    const dt = Math.min(clock.getDelta(), 0.1);   // clamp anti-tab-switch

    // --- FIXED TIMESTEP + ACCUMULATEUR (le pattern de la Session 5 !) ---
    // Rapier simule à pas FIXE. Si la frame a duré 2×FIXED_DT, on fait 2 pas.
    // C'est exactement ce que Godot fait en interne avec _physics_process.
    if (!params.pause) {
        accumulator += dt;
        while (accumulator >= FIXED_DT) {
            world.step();   // ← TOUTE la physique : intégration, broad phase,
            accumulator -= FIXED_DT;   //   narrow phase, solveur, sleeping…
        }
    }

    // --- SYNCHRONISATION rendu ← physique ---
    // La physique est la source de vérité : on copie les positions/rotations
    // du moteur vers les meshes. Jamais l'inverse.
    for (const { mesh, body } of pairs) {
        const t = body.translation();      // { x, y, z }
        const r = body.rotation();         // quaternion { x, y, z, w }
        mesh.position.set(t.x, t.y, t.z);
        mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    updateHUD();
    renderer.render(scene, camera);
}

// ============================================================
//  HUD — observons le SLEEPING (Partie 2 du cours)
// ============================================================
function updateHUD() {
    let sleeping = 0, dynamic = 0;
    for (const { body } of pairs) {
        if (body.isDynamic()) {
            dynamic++;
            if (body.isSleeping()) sleeping++;
        }
    }
    document.getElementById('hud').textContent =
        `Corps dynamiques : ${dynamic}   |   Endormis : ${sleeping}   ` +
        `(le sleeping économise le CPU — réveil au contact)`;
}

// ============================================================
//  OUTILS
// ============================================================
function addBody(mesh, bodyDesc, colliderDesc) {
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(colliderDesc, body);
    pairs.push({ mesh, body });
    return body;
}

function removePair(pair) {
    scene.remove(pair.mesh);
    pair.mesh.geometry.dispose();
    pair.mesh.material.dispose();
    world.removeRigidBody(pair.body);
    pairs = pairs.filter(p => p !== pair);
}

function resetScene() {
    for (const p of [...pairs]) removePair(p);
    createStack();
    accumulator = 0;
}

function setupGUI() {
    const gui = new GUI();
    gui.add(params, 'gravity', -20, 0, 0.1).name('⚖️ Gravité Y').onChange(v => {
        world.gravity = { x: 0, y: v, z: 0 };
        // Réveiller tout le monde : la gravité a changé, les corps
        // endormis doivent réagir (sinon ils dorment avec l'ancienne loi !)
        for (const { body } of pairs) body.wakeUp();
    });
    gui.add(params, 'cannonSpeed', 10, 1500, 1).name('🚀 Vitesse du boulet');
    gui.add(params, 'ccd').name('👁️ CCD (anti-tunneling)');
    gui.add(params, 'restitution', 0, 1, 0.05).name('🏀 Rebond');
    gui.add(params, 'friction', 0, 1, 0.05).name('🧊 Friction');
    gui.add(params, 'pause').name('⏸️ Pause');
    gui.add(params, 'reset').name('♻️ Reset');
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
//  GO — attention : init est async (chargement WASM)
// ============================================================
init().catch(err => {
    document.getElementById('hud').textContent =
        'Erreur de chargement de Rapier (WASM) : ' + err.message;
    console.error(err);
});

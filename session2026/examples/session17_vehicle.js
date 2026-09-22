import * as THREE from 'three';
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import RAPIER from 'rapier';

// ============================================================
//  SESSION 17 — TP VÉHICULES (Raycast Vehicle)
//
//  Un châssis, 4 raycasts (roues), un terrain avec rampe.
//  La GUI bascule entre les deux phases du TP :
//    - MANUEL  (Phase A) : la suspension à la main
//    - RAPIER  (Phase B) : le vehicle controller du moteur
//
//  EXERCICES (à compléter) :
//    M2 : la suspension   — ressort + amortisseur (updateManual)
//    M3 : le pilotage      — moteur, frein, direction (updateManual)
//    M5 : le contrôleur    — DynamicRayCastVehicleController (updateRapier)
//
//  Tout le reste (scène, raycasts, visuels, caméra) est donné.
//  Solution complète : session17_vehicle_solution.js
// ============================================================

const FIXED_DT = 1 / 60;

// Les DEUX phases appliquent la force moteur AU SOL (sous le centre de masse) :
// c'est ce qui fait piquer/cabrer la voiture. Comme les deux appliquent au même
// endroit, params.engineForce est la force TOTALE dans les deux cas.

const params = {
    mode: 'manuel',          // 'manuel' (Phase A) ou 'rapier' (Phase B)
    k: 12000,                // raideur du ressort (N/m)
    damping: 800,            // amortisseur (N·s/m)
    grip: 0.9,               // μ — adhérence latérale max
    engineForce: 2500,       // force moteur TOTALE (N), appliquée AU SOL (M3)
    steerMax: 0.4,           // braquage max des roues avant (rad)
    steerGain: 2500,         // gain du servo de lacet (N·m par rad/s)
    reset: reset,
};

// 4 roues : point d'attache (local au châssis), avant = -Z
const WHEELS = [
    { attach: new THREE.Vector3(-0.8, 0, -1.05), restLength: 0.5, radius: 0.35, front: true  },
    { attach: new THREE.Vector3( 0.8, 0, -1.05), restLength: 0.5, radius: 0.35, front: true  },
    { attach: new THREE.Vector3(-0.8, 0,  1.05), restLength: 0.5, radius: 0.35, front: false },
    { attach: new THREE.Vector3( 0.8, 0,  1.05), restLength: 0.5, radius: 0.35, front: false },
];
const WHEELBASE = Math.abs(WHEELS[0].attach.z - WHEELS[2].attach.z);   // 2.1 m
const SPAWN = { pos: { x: 0, y: 1.2, z: 10 }, rot: { x: 0, y: 0, z: 0, w: 1 } };

let scene, camera, renderer;
let world;
let chassisBody, chassisMesh, chassisCollider;
let wheelMeshes = [], rayLines = [];
let vehicleController = null;   // Phase B — créé paresseusement
let accumulator = 0;
let wheelsOnGround = 0;
const keys = {};
let steerInput = 0;
let wheelSpin = 0;                              // angle de roulement des roues (visuel)
let lastVisTime = performance.now();
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

// ============================================================
//  INITIALISATION
// ============================================================
async function init() {
    await RAPIER.init({});

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.Fog(0x0a0e14, 40, 90);

    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 4, 18);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x606080, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(20, 30, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -30; dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;   dir.shadow.camera.bottom = -30;
    scene.add(dir);

    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    createTerrain();
    await createVehicle();

    const gui = new GUI({ title: 'Session 17 — TP Véhicules' });
    gui.add(params, 'mode', { 'MANUEL (Phase A)': 'manuel', 'RAPIER (Phase B)': 'rapier' });
    gui.add(params, 'k', 2000, 30000, 500);
    gui.add(params, 'damping', 0, 3000, 50);
    gui.add(params, 'grip', 0.1, 1.5, 0.05);
    gui.add(params, 'engineForce', 500, 12000, 250);
    gui.add(params, 'steerMax', 0.1, 0.8, 0.05);
    gui.add(params, 'steerGain', 500, 6000, 250);
    gui.add(params, 'reset');

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR') reset();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    animate();
}

// ============================================================
//  TERRAIN (M4) — sol, rampe, bosses, obstacles
// ============================================================
function createTerrain() {
    // Sol — texture grille du cours
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setFriction(0.9), ground);
    const grid = new THREE.TextureLoader().load('./textures/grid.png');
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(40, 40);
    grid.anisotropy = 8;
    const groundMesh = new THREE.Mesh(
        new THREE.BoxGeometry(80, 0.2, 80),
        new THREE.MeshStandardMaterial({ map: grid, roughness: 0.9 })
    );
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Murs d'enceinte — pour ne pas tomber hors de l'arène
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3a3a, roughness: 0.8 });
    function addWall(x, z, hx, hz) {
        const H = 3;
        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(x, H / 2, z)
        );
        world.createCollider(
            RAPIER.ColliderDesc.cuboid(hx, H / 2, hz).setFriction(0.5), body
        );
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, H, hz * 2), wallMat);
        mesh.position.set(x, H / 2, z);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    }
    addWall( 40, 0, 0.5, 40);
    addWall(-40, 0, 0.5, 40);
    addWall(0,  40, 40, 0.5);
    addWall(0, -40, 40, 0.5);

    // Rampe (montée vers -Z) — la voiture arrive depuis +Z :
    // le bord proche doit être BAS, le bord lointain HAUT.
    const rampAngle = 0.32;
    const rampQuat = { x: Math.sin(rampAngle / 2), y: 0, z: 0, w: Math.cos(rampAngle / 2) };
    const ramp = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.9, -10).setRotation(rampQuat)
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(3, 0.3, 4).setFriction(0.9), ramp);
    const rampMesh = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a6a3a })
    );
    rampMesh.position.set(0, 0.9, -10);
    rampMesh.quaternion.set(rampQuat.x, rampQuat.y, rampQuat.z, rampQuat.w);
    rampMesh.castShadow = rampMesh.receiveShadow = true;
    scene.add(rampMesh);

    // Bosses (sphères à moitié enterrées) — terrain de jeu accidenté
    const bumps = [
        { x: -5, z: -2, r: 0.5 },   { x: -6.5, z: -6, r: 0.7 }, { x: 5, z: -4, r: 0.9 },
        { x: 12, z: -8, r: 0.45 },  { x: -10, z: 2, r: 0.6 },   { x: -12, z: 8, r: 0.8 },
        { x: 9, z: 3, r: 0.5 },     { x: 12, z: 9, r: 0.7 },    { x: 3, z: -20, r: 0.6 },
        { x: -4, z: -22, r: 0.9 },  { x: 14, z: -18, r: 0.8 },  { x: -14, z: -14, r: 0.7 },
        { x: 18, z: -6, r: 0.6 },   { x: -18, z: 0, r: 1.1 },   { x: 22, z: 4, r: 0.5 },
        { x: -22, z: 10, r: 0.9 },  { x: 8, z: 16, r: 0.7 },    { x: -9, z: 18, r: 0.5 },
        { x: 0, z: 24, r: 1.0 },    { x: 16, z: 22, r: 0.6 },   { x: -16, z: 24, r: 0.8 },
        { x: 26, z: -12, r: 0.7 },  { x: -26, z: -8, r: 0.6 },  { x: 24, z: 14, r: 1.2 },
        { x: -24, z: -20, r: 0.9 }, { x: 20, z: -26, r: 0.6 },  { x: -20, z: 18, r: 0.5 },
        { x: 6, z: -28, r: 0.8 },   { x: -8, z: 30, r: 0.7 },   { x: 30, z: 0, r: 0.9 },
        { x: -30, z: 6, r: 0.6 },   { x: 28, z: 24, r: 0.5 },   { x: -28, z: -28, r: 0.8 },
        { x: -3, z: 6, r: 0.5 },    { x: 5, z: 8, r: 0.6 },
    ];
    for (const b of bumps) {
        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, -b.r * 0.3, b.z)
        );
        world.createCollider(RAPIER.ColliderDesc.ball(b.r).setFriction(0.9), body);
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(b.r, 24, 16),
            new THREE.MeshStandardMaterial({ color: 0x556b55 })
        );
        mesh.position.set(b.x, -b.r * 0.3, b.z);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    }

    // Obstacles (boîtes fixes)
    for (const o of [{ x: 7, z: -12 }, { x: -8, z: -16 }]) {
        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(o.x, 0.75, o.z)
        );
        world.createCollider(RAPIER.ColliderDesc.cuboid(0.75, 0.75, 0.75), body);
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x6a4a5a })
        );
        mesh.position.set(o.x, 0.75, o.z);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    }
}

// ============================================================
//  VÉHICULE (M1) — châssis + roues visuelles + rayons
// ============================================================
async function createVehicle() {
    // Châssis : boîte dynamique, demi-tailles (0.9, 0.25, 1.2)
    chassisBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(SPAWN.pos.x, SPAWN.pos.y, SPAWN.pos.z)
            .setLinearDamping(0.05)
            .setAngularDamping(1.5)
    );
    chassisCollider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.9, 0.25, 1.2)
            .setDensity(150)          // ≈ 324 kg
            .setFriction(0.2)
            .setRestitution(0.0),
        chassisBody
    );

    // Châssis visuel : modèle Kenney (CC0 — kenney.nl). On masque ses roues :
    // les nôtres sont dessinées à partir des raycasts de suspension.
    // Repli sur une simple boîte si le modèle est absent.
    chassisMesh = new THREE.Group();
    try {
        const gltf = await new GLTFLoader().loadAsync('./models/sedan.glb');
        const car = gltf.scene;
        car.traverse((o) => {
            if (!o.isMesh) return;
            o.castShadow = true;
            if (/wheel/i.test(o.name)) o.visible = false;
        });
        car.rotation.y = Math.PI;     // le modèle regarde +Z, nous -Z
        car.scale.setScalar(1.2);     // largeur 1.5 → 1.8 (celle du châssis)
        car.position.y = -0.78;       // le modèle a son origine AU SOL
        chassisMesh.add(car);
    } catch (err) {
        console.warn('Modèle Kenney introuvable — repli sur une boîte.', err);
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.5, 2.4),
            new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.5, metalness: 0.3 })
        );
        box.castShadow = true;
        chassisMesh.add(box);
    }

    scene.add(chassisMesh);

    // Roues visuelles (découplées de la physique)
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 20);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(wheelGeo, wheelMat);
        mesh.castShadow = true;
        scene.add(mesh);
        wheelMeshes.push(mesh);

        const line = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x00ffff })
        );
        scene.add(line);
        rayLines.push(line);
    }
}

// ============================================================
//  PHASE A — MODE MANUEL (M2 : suspension, M3 : pilotage)
// ============================================================
function updateManual(dt) {
    const pos = chassisBody.translation();
    const rot = chassisBody.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const vel = chassisBody.linvel();
    const angvel = chassisBody.angvel();

    let contactY = 0, contacts = 0;

    for (let i = 0; i < 4; i++) {
        const w = WHEELS[i];

        // Point d'attache dans le monde (DONNÉ)
        const attach = w.attach.clone().applyQuaternion(quat)
            .add(new THREE.Vector3(pos.x, pos.y, pos.z));

        // Raycast vers le bas (DONNÉ)
        const hit = castWheelRay(attach, w.restLength + w.radius);

        if (hit) {
            // ==================================================
            // TODO (M2) — LA SUSPENSION
            //
            // 1. suspLength  = max(0, hit.timeOfImpact - w.radius)
            //    compression = 1 - suspLength / w.restLength
            // 2. springF = params.k * compression * w.restLength
            // 3. damperF = params.damping *
            //        verticalVelocity(attach, pos, vel, angvel)
            //    (helper donné en bas du fichier)
            // 4. chassisBody.addForceAtPoint(
            //        { x: 0, y: springF - damperF, z: 0 },
            //        { x: attach.x, y: attach.y, z: attach.z }, true)
            // ==================================================

            contactY += attach.y - hit.timeOfImpact;   // DONNÉ
            contacts++;
        }
    }

    // Point d'application des forces HORIZONTALES (DONNÉ) : AU SOL, sous le
    // centre de masse. Une force au centre de masse ne crée AUCUN couple — la
    // voiture ne piquerait ni ne roulerait. Au sol, elle crée le couple de
    // *tangage* (accél./freinage) et de *roulis* (virage).
    const groundPoint = {
        x: pos.x,
        y: contacts ? contactY / contacts
                    : pos.y - (WHEELS[0].restLength + WHEELS[0].radius),
        z: pos.z,
    };

    // ==========================================================
    // TODO (M3) — LE PILOTAGE
    //
    // const forward = chassisForward(quat);          (helper donné)
    // const vFwd = forward · vel;                    (vitesse SIGNÉE)
    //
    // 1. Accélérer / freiner (W / S) :
    //        throttle = 1 si W, -0.75 si S, 0 sinon
    //        addForceAtPoint(forward * params.engineForce * throttle, groundPoint, true)
    //
    // 2. Tourner (A / D) — servo de lacet cinématique (modèle du vélo) :
    //        const steerAngle  = steerInput * params.steerMax;
    //        const omegaTarget = (vFwd / WHEELBASE) * Math.tan(steerAngle);
    //        addTorque({ x: 0, y: params.steerGain * (omegaTarget - angvel.y), z: 0 })
    //    → proportionnel à la vitesse signée (s'inverse en marche arrière)
    //      et borné (la voiture ne part plus en toupie).
    //
    // NB : on pousse AU SOL (groundPoint), pas au centre de masse — c'est
    //      ce qui fait piquer la voiture au freinage.
    // ==========================================================

    // GRIP (DONNÉ) — force latérale plafonnée par μ·m·g
    applyGrip(quat, vel, groundPoint);
}

// ============================================================
//  PHASE B — MODE RAPIER (M5 : le vehicle controller)
// ============================================================
function updateRapier(dt) {
    // ==========================================================
    // TODO (M5) — LE CONTRÔLEUR DE VÉHICULE
    //
    // 1. Une seule fois (création paresseuse) :
    //      if (!vehicleController) {
    //          vehicleController = world.createVehicleController(chassisBody);
    //          for (let i = 0; i < 4; i++) {
    //              const w = WHEELS[i];
    //              vehicleController.addWheel(
    //                  { x: w.attach.x, y: w.attach.y, z: w.attach.z },
    //                  { x: 0, y: -1, z: 0 },    // direction du rayon
    //                  { x: -1, y: 0, z: 0 },   // axe de la roue
    //                  w.restLength, w.radius);
    //              vehicleController.setWheelSuspensionStiffness(i, 24);
    //              vehicleController.setWheelSuspensionRelaxation(i, 2.3);
    //              vehicleController.setWheelSuspensionCompression(i, 4.4);
    //              vehicleController.setWheelFrictionSlip(i, 10.5);
    //              vehicleController.setWheelMaxSuspensionForce(i, 30000);
    //          }
    //      }
    //    NB : les paramètres sont NORMALISÉS par la masse du châssis
    //    (stiffness 24 ≈ votre k de Phase A : 24 × 324 kg ≈ 7800 N/m).
    //
    // 2. Chaque frame :
    //      roues AVANT (i = 0, 1) : setWheelSteering(i, steerInput * 0.4)
    //      roues ARRIÈRE (i = 2, 3) : setWheelEngineForce(i, -throttle * params.engineForce / 2)
    //      (throttle = 1 si W, -0.75 si S, 0 sinon)
    //      NB : signe négatif = convention d'axe Rapier ; /2 = 2 roues
    //           motrices, donc params.engineForce reste la force TOTALE
    //           (les deux phases poussent au sol → même comportement).
    //
    // 3. vehicleController.updateVehicle(dt);
    // ==========================================================

}

// ============================================================
//  GRIP (DONNÉ) — adhérence latérale, modèle arcade
// ============================================================
function applyGrip(quat, vel, groundPoint) {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const latVel = right.x * vel.x + right.y * vel.y + right.z * vel.z;
    const m = 324, g = 9.81;
    const maxF = params.grip * m * g;
    const f = Math.max(-maxF, Math.min(maxF, -latVel * 2500));
    chassisBody.addForceAtPoint(
        { x: right.x * f, y: right.y * f, z: right.z * f }, groundPoint, true
    );
}

// ============================================================
//  HELPERS
// ============================================================
// Rayon de suspension : depuis le point d'attache, vers le bas.
// IMPORTANT — on EXCLUT le collider du châssis. Sans ça, le rayon
// part de l'intérieur du châssis et le touche à timeOfImpact = 0
// (roues dessinées à l'envers, force de suspension constante).
function castWheelRay(attach, maxDist) {
    const ray = new RAPIER.Ray(
        { x: attach.x, y: attach.y, z: attach.z },
        { x: 0, y: -1, z: 0 }
    );
    return world.castRay(ray, maxDist, true, undefined, undefined, chassisCollider);
}

function chassisForward(quat) {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
}

// Vitesse verticale du point d'attache : v + ω × r
function verticalVelocity(attach, chassisPos, vel, angvel) {
    const r = new THREE.Vector3(
        attach.x - chassisPos.x, attach.y - chassisPos.y, attach.z - chassisPos.z
    );
    const w = new THREE.Vector3(angvel.x, angvel.y, angvel.z);
    return vel.y + w.cross(r).y;
}

// ============================================================
//  VISUELS (DONNÉ) — roues, rayons, châssis, caméra
// ============================================================
function updateVisuals() {
    const pos = chassisBody.translation();
    const rot = chassisBody.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

    chassisMesh.position.set(pos.x, pos.y, pos.z);
    chassisMesh.quaternion.copy(quat);

    // Orientation des roues : celle du châssis, + braquage (roues avant),
    // + roulement autour de l'axe de la roue (local X).
    const vel = chassisBody.linvel();
    const fwd = chassisForward(quat);
    const fwdSpeed = fwd.x * vel.x + fwd.y * vel.y + fwd.z * vel.z;
    const now = performance.now();
    wheelSpin -= (fwdSpeed / WHEELS[0].radius) * Math.min((now - lastVisTime) / 1000, 0.1);
    lastVisTime = now;

    const steerQuat = new THREE.Quaternion().setFromAxisAngle(UP, steerInput * 0.4);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(RIGHT, wheelSpin);

    wheelsOnGround = 0;
    for (let i = 0; i < 4; i++) {
        const w = WHEELS[i];
        const attach = w.attach.clone().applyQuaternion(quat)
            .add(new THREE.Vector3(pos.x, pos.y, pos.z));

        const hit = castWheelRay(attach, w.restLength + w.radius);
        const dist = hit ? hit.timeOfImpact : w.restLength + w.radius;
        if (hit) wheelsOnGround++;

        // Roue : point de contact (ou pendante), orientée comme le châssis
        wheelMeshes[i].position.set(attach.x, attach.y - dist + w.radius, attach.z);
        const wheelQuat = quat.clone();
        if (w.front) wheelQuat.multiply(steerQuat);
        wheelQuat.multiply(spinQuat);
        wheelMeshes[i].quaternion.copy(wheelQuat);

        // Rayon
        setLine(rayLines[i], attach, { x: attach.x, y: attach.y - dist, z: attach.z });
    }

    // Caméra poursuite (yaw uniquement — pas de roulis)
    const yawFwd = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
    const camTarget = new THREE.Vector3(pos.x, pos.y, pos.z)
        .addScaledVector(yawFwd, -7).add(new THREE.Vector3(0, 3.2, 0));
    camera.position.lerp(camTarget, 0.06);
    camera.lookAt(pos.x, pos.y + 0.5, pos.z);
}

function setLine(line, start, end) {
    line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(
        [start.x, start.y, start.z, end.x, end.y, end.z], 3));
}

// ============================================================
//  BOUCLE
// ============================================================
function animate() {
    requestAnimationFrame(animate);

    // Input → steering lissé
    const steerTarget = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0)
                      - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
    steerInput += (steerTarget - steerInput) * 0.15;

    accumulator += Math.min(clockDelta(), 0.1);
    while (accumulator >= FIXED_DT) {
        // Rapier n'efface PAS les forces/torques utilisateur après un step :
        // addForce/addForceAtPoint/addTorque s'ACCUMULENT frame après frame.
        // Sans ce reset, la suspension s'emballe et la voiture s'envole.
        chassisBody.resetForces(true);
        chassisBody.resetTorques(true);
        if (params.mode === 'manuel') updateManual(FIXED_DT);
        else updateRapier(FIXED_DT);
        world.step();
        accumulator -= FIXED_DT;
    }

    updateVisuals();

    const vel = chassisBody.linvel();
    const speed = Math.hypot(vel.x, vel.y, vel.z) * 3.6;
    document.getElementById('hud').textContent =
        `${params.mode === 'manuel' ? 'MANUEL (Phase A)' : 'RAPIER (Phase B)'} · ` +
        `${speed.toFixed(0)} km/h · roues au sol : ${wheelsOnGround}/4`;

    renderer.render(scene, camera);
}

let lastTime = performance.now();
function clockDelta() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    return dt;
}

// ============================================================
//  RESET
// ============================================================
function reset() {
    chassisBody.setTranslation(SPAWN.pos, true);
    chassisBody.setRotation(SPAWN.rot, true);
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    steerInput = 0;
}

// ============================================================
//  DÉMARRAGE
// ============================================================
init();

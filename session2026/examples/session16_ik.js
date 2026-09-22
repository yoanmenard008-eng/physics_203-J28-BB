import * as THREE from 'three';
import { GUI } from 'https://unpkg.com/lil-gui@0.20.0/dist/lil-gui.esm.min.js';

// ============================================================
//  SESSION 16 — IK : un bras, une cible, deux algorithmes
//
//  L'anneau jaune suit la souris. Le bras doit le poursuivre,
//  en CCD ou en FABRIK (au choix dans la GUI).
//
//  EXERCICES (à compléter) :
//    Exercice 1 : ccdSolve()     — la rotation des articulations
//    Exercice 2 : fabrikSolve()  — les passes forward / backward
//
//  Solution complète : session16_ik_solution.js
// ============================================================

const SEGMENTS = 4;                                    // nombre de segments
const SEG_LEN = 0.8;                                   // longueur d'un segment (m)
const LENGTHS = new Array(SEGMENTS).fill(SEG_LEN);

const params = {
    algorithm: 'ccd',
    iterations: 20,
    tolerance: 0.01,
    reset: reset,
};

let scene, camera, renderer;
let joints = [];                                       // positions des articulations
const base = new THREE.Vector3(0, 1, 0);               // base fixe
const target = new THREE.Vector3(2, 3, 0);             // cible (suit la souris)
let jointMeshes = [];
let armLine, targetMesh;
let iterationsUsed = 0;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

setup();

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);

    // Caméra FIXE face au plan z=0 — pas d'orbite, pas de clic :
    // la cible suit simplement la souris.
    camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 9);
    camera.lookAt(0, 2.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x606080, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 6, 5);
    scene.add(dir);

    // Socle
    const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    pedestal.position.set(base.x, base.y - 0.15, 0);
    scene.add(pedestal);

    // Articulations (sphères)
    const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x003322 });
    for (let i = 0; i <= SEGMENTS; i++) {
        const m = new THREE.Mesh(sphereGeo, jointMat);
        scene.add(m);
        jointMeshes.push(m);
    }

    // Segments (une seule polyline)
    armLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0x00ffcc })
    );
    scene.add(armLine);

    // Cible (anneau)
    targetMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.04, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 })
    );
    scene.add(targetMesh);

    // GUI
    const gui = new GUI({ title: 'Session 16 — IK' });
    gui.add(params, 'algorithm', { CCD: 'ccd', FABRIK: 'fabrik' });
    gui.add(params, 'iterations', 1, 50, 1);
    gui.add(params, 'tolerance', 0.001, 0.1, 0.001);
    gui.add(params, 'reset');

    // La cible suit la souris (projetée sur le plan z=0)
    window.addEventListener('pointermove', (e) => {
        ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const p = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(planeZ0, p)) {
            target.set(
                Math.max(-4, Math.min(4, p.x)),
                Math.max(0.3, Math.min(6, p.y)),
                0
            );
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    reset();
    animate();
}

function reset() {
    // Bras étiré vers le haut
    joints = [];
    for (let i = 0; i <= SEGMENTS; i++) {
        joints.push(new THREE.Vector3(base.x, base.y + i * SEG_LEN, 0));
    }
    target.set(2, 3, 0);
}

// ============================================================
//  EXERCICE 1 — CCD (Cyclic Coordinate Descent)
//
//  À IMPLÉMENTER : la rotation des articulations.
//  Pour chaque articulation i (de l'avant-dernière jusqu'à la base) :
//    1. toEnd  = extrémité - joints[i]     (l'extrémité BOUGE : relisez
//                 joints[n-1] à chaque fois, ne la cachez pas)
//    2. toGoal = cible - joints[i]
//    3. angle  = angle entre toEnd et toGoal
//    4. tourner toutes les articulations j > i de angle autour de joints[i]
//  Helpers : sub(), angleBetween(), rotateAround()
// ============================================================
function ccdSolve(joints, target, iterations, tolerance) {
    const n = joints.length;
    for (let iter = 0; iter < iterations; iter++) {
        if (joints[n - 1].distanceTo(target) < tolerance) return iter + 1;

        // TODO (Exercice 1) …

    }
    return iterations;
}

// ============================================================
//  EXERCICE 2 — FABRIK (Forward And Backward Reaching IK)
//
//  À IMPLÉMENTER : les deux passes.
//  FORWARD  (cible → base)   : extrémité sur la cible, puis repositionner
//                             chaque joint pour respecter les longueurs.
//  BACKWARD (base → extrémité) : base remise à l'origine, puis repositionner
//                             vers l'extrémité.
//  Le cas « hors de portée » est déjà géré ci-dessous.
// ============================================================
function fabrikSolve(joints, target, origin, lengths, iterations, tolerance) {
    const n = joints.length;
    const totalLength = lengths.reduce((a, b) => a + b, 0);

    // Hors de portée : on étire le bras vers la cible
    if (joints[0].distanceTo(target) > totalLength) {
        for (let i = 0; i < n - 1; i++) {
            const r = joints[i].distanceTo(target);
            const lambda = lengths[i] / r;
            joints[i + 1].lerpVectors(joints[i], target, lambda);
        }
        return 1;
    }

    for (let iter = 0; iter < iterations; iter++) {
        if (joints[n - 1].distanceTo(target) < tolerance) return iter + 1;

        // --- FORWARD (cible → base) ---
        // TODO (Exercice 2a) …

        // --- BACKWARD (base → extrémité) ---
        // TODO (Exercice 2b) …

    }
    return iterations;
}

// ============================================================
//  BOUCLE DE RENDU
// ============================================================
function animate() {
    requestAnimationFrame(animate);

    // Résoudre avec l'algorithme choisi
    iterationsUsed = params.algorithm === 'ccd'
        ? ccdSolve(joints, target, params.iterations, params.tolerance)
        : fabrikSolve(joints, target, base, LENGTHS, params.iterations, params.tolerance);

    // Visuels
    for (let i = 0; i <= SEGMENTS; i++) jointMeshes[i].position.copy(joints[i]);
    const pts = [];
    for (const j of joints) pts.push(j.x, j.y, j.z);
    armLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    targetMesh.position.copy(target);
    targetMesh.rotation.z += 0.02;

    // Cible hors de portée ? → rouge
    const reachable = base.distanceTo(target) <= SEGMENTS * SEG_LEN;
    targetMesh.material.color.set(reachable ? 0xffff00 : 0xff3333);
    targetMesh.material.emissive.set(reachable ? 0x444400 : 0x441100);

    // HUD
    const err = joints[SEGMENTS].distanceTo(target).toFixed(3);
    document.getElementById('hud').textContent =
        `${params.algorithm.toUpperCase()} · itérations : ${iterationsUsed} · erreur : ${err}`;

    renderer.render(scene, camera);
}

// ============================================================
//  HELPERS
// ============================================================
function sub(a, b) {
    return new THREE.Vector3().subVectors(a, b);
}

function angleBetween(a, b) {
    return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
}

function rotateAround(point, pivot, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = point.x - pivot.x, dy = point.y - pivot.y;
    return new THREE.Vector3(pivot.x + dx * c - dy * s, pivot.y + dx * s + dy * c, point.z);
}

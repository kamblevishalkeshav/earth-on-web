// orbitFrameLoader.js – build & update LVLH (Local Vertical Local Horizontal) orbit frame
// -----------------------------------------------------------------------------
// Exports
//   createOrbitFrame(scene, lengthKm?)               → OrbitFrame ({…helpers, len})
//   updateOrbitFrame(orbitFrame, satPos, satVel)     → void
//   setOrbitFrameVisibility(of, visible)             → void   (preferred show/hide)
//   disposeOrbitFrame(of)                            → void   (free GPU resources)
// -----------------------------------------------------------------------------
//
// LVLH conventions
//   +Z  → nadir (toward geocentre)
//   +Y  → –h (opposite angular‑momentum, ~south for GEO)
//   +X  → completes RH frame (~velocity / east for GEO)
// -----------------------------------------------------------------------------

import * as THREE from 'three';
import { KM_TO_SCENE_UNITS } from './SatelliteConstantLoader.js';

/* ─────────── Tunables ─────────── */
const DEFAULT_AXIS_LEN_KM = 10000;
const AXIS_COLOR_X        = 0x0080ff;
const AXIS_COLOR_Y        = 0xff4080;
const AXIS_COLOR_Z        = 0x00ff80;
const LABEL_OFFSET        = 1.0;
const HEAD_RATIO          = 0.07;
const HEAD_WIDTH_RATIO    = 0.4;

/* ─────────── Internals ─────────── */
function makeArrow(dir, len, color) {
    return new THREE.ArrowHelper(
        dir, new THREE.Vector3(), len,
        color,
        len * HEAD_RATIO,
        len * HEAD_RATIO * HEAD_WIDTH_RATIO
    );
}
const HTML_LABELS = {};
function htmlLabel(id, text) {
    if (HTML_LABELS[id]) return HTML_LABELS[id];
    const div   = document.createElement('div');
    div.id      = id;
    div.className = 'axis-label';
    div.innerHTML = text;
    div.style.cssText = 'position:absolute; pointer-events:none; display:none;';
    document.body.appendChild(div);
    HTML_LABELS[id] = div;
    return div;
}
function projToScreen(v, camera, renderer) {
    const p = v.clone().project(camera);
    return {
        x: ( p.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
        y: (-p.y * 0.5 + 0.5) * renderer.domElement.clientHeight
    };
}
function place(el, x, y, show) {
    if (!el) return;
    el.style.left   = `${x}px`;
    el.style.top    = `${y}px`;
    el.style.display = show ? 'block' : 'none';
}

/* ─────────── Public API ─────────── */
export function createOrbitFrame(scene, lengthKm = DEFAULT_AXIS_LEN_KM) {
    const len  = lengthKm * KM_TO_SCENE_UNITS;

    const xArr = makeArrow(new THREE.Vector3( 1,0,0), len, AXIS_COLOR_X);
    const yArr = makeArrow(new THREE.Vector3( 0,1,0), len, AXIS_COLOR_Y);
    const zArr = makeArrow(new THREE.Vector3( 0,0,1), len, AXIS_COLOR_Z);
    scene.add(xArr, yArr, zArr);

    const lblX = htmlLabel('labelOrbitX', '+X');
    const lblY = htmlLabel('labelOrbitY', '+Y');
    const lblZ = htmlLabel('labelOrbitZ', '+Z');

    return { xArr, yArr, zArr, lblX, lblY, lblZ, len };
}

export function updateOrbitFrame(of, satPos, satVel) {
    if (!of || !satPos || !satVel) return;

    /* unit vectors */
    const r = satPos.clone();
    const v = satVel.clone();
    const rLen = r.length();
    const h    = r.clone().cross(v);
    const hLen = h.length();
    if (rLen < 1e-6 || hLen < 1e-6) return;

    const zHat = r.clone().multiplyScalar(-1 / rLen);
    const yHat = h.clone().multiplyScalar(-1 / hLen);
    const xHat = new THREE.Vector3().crossVectors(yHat, zHat).normalize();

    /* arrow directions + tail at satellite position */
    of.xArr.setDirection(xHat);  of.xArr.position.copy(r);
    of.yArr.setDirection(yHat);  of.yArr.position.copy(r);
    of.zArr.setDirection(zHat);  of.zArr.position.copy(r);

    /* labels */
    if (window.renderer && window.camera) {
        const offs = of.len + LABEL_OFFSET;
        const tipX = r.clone().add(xHat.clone().multiplyScalar(offs));
        const tipY = r.clone().add(yHat.clone().multiplyScalar(offs));
        const tipZ = r.clone().add(zHat.clone().multiplyScalar(offs));

        const pX = projToScreen(tipX, camera, renderer);
        const pY = projToScreen(tipY, camera, renderer);
        const pZ = projToScreen(tipZ, camera, renderer);

        place(of.lblX, pX.x, pX.y, true);
        place(of.lblY, pY.x, pY.y, true);
        place(of.lblZ, pZ.x, pZ.y, true);
    }
}

function setVis(obj, v) { if (obj) obj.visible = v; }
export function setOrbitFrameVisibility(of, visible) {
    if (!of) return;
    ['xArr','yArr','zArr'].forEach(k => setVis(of[k], visible));
    ['lblX','lblY','lblZ'].forEach(k => {
        const el = of[k];
        if (el) el.style.display = visible ? 'block' : 'none';
    });
}

export function disposeOrbitFrame(of) {
    if (!of) return;
    ['xArr','yArr','zArr'].forEach(k => {
        if (of[k]) {
            of[k].geometry.dispose?.();
            of[k].material.dispose?.();
        }
    });
    setOrbitFrameVisibility(of, false);
}

// js/satelliteModelLoader.js  (ES‑module version)
// -----------------------------------------------------------------------------
// Build & display detailed satellite models from <noradId>.json descriptions.
// Exports:
//    showSatellite(noradId, scene)          → Promise<THREE.Group|null>
//    clearCurrentDetailedSat(scene)         → void
// -----------------------------------------------------------------------------

// You can import like:
// import { showSatellite, clearCurrentDetailedSat } from './js/satelliteModelLoader.js';

// ---------------------------------------------------------------------------
//  Soft dependencies (grabbed from global if host page already loaded them)
// ---------------------------------------------------------------------------
import * as THREE from 'three';

// optional – fall back to window.CSS2DObject if not available via module path
let CSS2DObject;
try {
    ({ CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js'));
} catch { CSS2DObject = window.CSS2DObject; }

const renderer        = window.renderer || null;
const METERS_TO_UNITS = window.METERS_TO_SCENE_UNITS || 1.0;
const getFullGitHubUrl = window.getFullGitHubUrl || (p => p);
const fetchJSON        = window.fetchJSON || (async url => (await fetch(url)).json());

// ---------------------------------------------------------------------------
//  Configurable base path for JSON models & textures
// ---------------------------------------------------------------------------
export const SATELLITE_MODELS_BASE_URL = window.SATELLITE_MODELS_BASE_URL || 'json/satellites/';

// Caches ─────────────────────────────────────────────────────────────────────
const foilCache  = new Map(); // key: repeat #
const panelCache = new Map();

// ---------------------------------------------------------------------------
//  Texture helpers
// ---------------------------------------------------------------------------
function generateFoilTexture(repeat = 4) {
    if (foilCache.has(repeat)) return foilCache.get(repeat);
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 150 + 80;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    foilCache.set(repeat, tex);
    return tex;
}

function loadSolarTexture(repeat = 3) {
    if (panelCache.has(repeat)) return panelCache.get(repeat);
    const panelURL = getFullGitHubUrl('textures/solar_panel_cells.png');
    const tex = new THREE.TextureLoader().load(panelURL, undefined, undefined,
        err => console.error('Solar‑panel texture failed:', panelURL, err));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    panelCache.set(repeat, tex);
    return tex;
}

// ---------------------------------------------------------------------------
//  Geometry builders
// ---------------------------------------------------------------------------
function orient(o, dir, axisY = true) {
    const R = Math.PI / 2;
    switch (dir) {
        case 'west':  axisY ? o.rotateZ( R) : o.rotateY( R); break;
        case 'east':  axisY ? o.rotateZ(-R) : o.rotateY(-R); break;
        case 'north': axisY ? o.rotateX( R) : null; break;
        case 'south': axisY ? o.rotateX(-R) : o.rotateY(Math.PI); break;
        case 'down':  axisY && o.rotateX(Math.PI); break;
    }
}

function busMesh(bus, tex) {
    return new THREE.Mesh(
        new THREE.BoxGeometry(bus.width_m * METERS_TO_UNITS, bus.height_m * METERS_TO_UNITS, bus.depth_m * METERS_TO_UNITS),
        new THREE.MeshPhongMaterial({ map: tex.foil, color: 0xffffff, shininess: 80 })
    );
}
function panelGroup(list, tex) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ map: tex.panel, side: THREE.DoubleSide });
    list.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.length_m * METERS_TO_UNITS, p.width_m * METERS_TO_UNITS), mat);
        mesh.position.set(...p.position_m.map(v => v * METERS_TO_UNITS));
        orient(mesh, p.orientation, false);
        g.add(mesh);
    });
    return g;
}
function antennaGroup(list, labelsRef) {
    const g = new THREE.Group();
    const dishMat = new THREE.MeshPhongMaterial({ color: 0xd8a65d, side: THREE.DoubleSide, shininess: 35 });
    const ttMat   = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    list.forEach(a => {
        let mesh;
        const R = a.radius_m * METERS_TO_UNITS;
        if (a.type === 'dish') {
            const D = a.depth_m * METERS_TO_UNITS;
            const prof = [ new THREE.Vector2(R,0), new THREE.Vector2(0.8*R,0.5*D), new THREE.Vector2(0.3*R,0.8*D), new THREE.Vector2(0,D) ];
            mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), dishMat);
        } else {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 8), ttMat);
        }
        mesh.position.set(...a.position_m.map(v=>v*METERS_TO_UNITS));
        if (a.orientation) orient(mesh, a.orientation);
        if (a.tilt_deg) mesh.rotateZ(THREE.MathUtils.degToRad(a.tilt_deg)*(a.orientation==='west'?1:-1));

        if (CSS2DObject) {
            const div = document.createElement('div');
            div.className = 'label'; div.textContent = a.band==='TT&C'?'TT&C':`${a.band}-band`;
            const lbl = new CSS2DObject(div); lbl.position.set(0, R*1.2, 0);
            mesh.add(lbl); labelsRef.push(lbl);
        }
        g.add(mesh);
    });
    return g;
}
function thrusterGroup(list) {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    list.forEach(t => {
        let mesh; const H = t.height_m * METERS_TO_UNITS;
        if (t.type === 'cylinder') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(t.radius_m * METERS_TO_UNITS, t.radius_m * METERS_TO_UNITS, H, 16), mat);
        } else {
            mesh = new THREE.Mesh(new THREE.ConeGeometry(t.radius_bottom_m * METERS_TO_UNITS, H, 16), mat);
            mesh.rotateX(Math.PI);
        }
        mesh.position.set(...t.position_m.map(v=>v*METERS_TO_UNITS));
        if (t.orientation) orient(mesh, t.orientation);
        g.add(mesh);
    });
    return g;
}
function buildSatellite(g, tex, labelsRef) {
    const root = new THREE.Group();
    if (g.bus) root.add(busMesh(g.bus, tex));
    if (g.solar_panels) root.add(panelGroup(g.solar_panels, tex));
    if (g.antennas) root.add(antennaGroup(g.antennas, labelsRef));
    if (g.thrusters) root.add(thrusterGroup(g.thrusters));
    return root;
}

// ---------------------------------------------------------------------------
//  Singleton state (current model & labels)
// ---------------------------------------------------------------------------
let currentSatModel = null;
const currentLabels = [];

export async function showSatellite(noradId, scene) {
    if (!scene) throw new Error('showSatellite: scene is required');
    // Clear previous
    clearCurrentDetailedSat(scene);
    const jsonURL = SATELLITE_MODELS_BASE_URL + `${noradId}.json`;
    console.log('satelliteModelLoader →', jsonURL);
    try {
        const data = await fetchJSON(jsonURL);
        if (!data?.[0]?.geometry) {
            console.warn('No geometry for NORAD', noradId); return null;
        }
        const textures = { foil: generateFoilTexture(4), panel: loadSolarTexture(3) };
        currentSatModel = buildSatellite(data[0].geometry, textures, currentLabels);
        currentSatModel.userData = { noradId, source: data[0] };
        scene.add(currentSatModel);
        return currentSatModel;
    } catch (e) {
        console.error('showSatellite failed', e);
        return null;
    }
}

export function clearCurrentDetailedSat(scene) {
    if (currentSatModel && scene) scene.remove(currentSatModel);
    currentLabels.forEach(l=>l.parent && l.parent.remove(l));
    currentLabels.length = 0; currentSatModel = null;
}

export default {
    showSatellite,
    clearCurrentDetailedSat
};

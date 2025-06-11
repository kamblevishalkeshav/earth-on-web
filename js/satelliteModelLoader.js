// js/satelliteModelLoader.js  (ES‑module) – updated for attitude/orbit fields
// -----------------------------------------------------------------------------
// Build & display detailed satellite models + beam helpers. Handles extended
// JSON schema with meta.attitude, meta.orbit.altitude, attitudeCapability, etc.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import {fetchJSON} from './SatelliteConfigurationLoader.js';

/* ─────────────────────────── Constants & helpers ─────────────────────────── */
const EARTH_RADIUS_KM = 6371;
const EARTH_SCENE_RADIUS = 10;
const KM_TO_SCENE_UNITS = EARTH_SCENE_RADIUS / EARTH_RADIUS_KM;
const METERS_TO_UNITS = window.METERS_TO_SCENE_UNITS || 1.0;
const renderer = window.renderer || null;
export const SATELLITE_MODELS_BASE_URL = window.SATELLITE_MODELS_BASE_URL || 'json/satellites/';

// Prefer explicit orbit.altitude (m) if provided, else fallback to nominal slot
function getNominalAltMeters(meta = {}) {
    if (meta.orbit?.altitude) return meta.orbit.altitude;
    const m = /([\d.]+)\s*km/i.exec(meta?.orbital_slot?.nominal ?? '');
    return m ? parseFloat(m[1]) * 1_000 : 35_786e3; // GEO default
}

const foilCache = new Map();
const panelCache = new Map();

function generateFoilTexture(rep = 4) {
    if (foilCache.has(rep)) return foilCache.get(rep);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 150 + 80;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    foilCache.set(rep, t);
    return t;
}

function loadSolarTexture(rep = 3) {
    if (panelCache.has(rep)) return panelCache.get(rep);
    const url = (window.getFullGitHubUrl || (p => p))('textures/solar_panel_cells.png');
    const t = new THREE.TextureLoader().load(url, undefined, undefined,
        e => console.error('Solar‑panel texture failed:', url, e));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    panelCache.set(rep, t);
    return t;
}

/* ───────────────────────── CSS2D (optional) ──────────────────────────────── */
let CSS2DObject;
try {
    ({CSS2DObject} = await import('three/addons/renderers/CSS2DRenderer.js'));
} catch {
    CSS2DObject = window.CSS2DObject;
}

/* ───────────────────────── Geometry helpers ─────────────────────────────── */
function orient(o, dir, aboutY = true) {
    const R = Math.PI / 2;
    switch (dir) {
        case 'west':
            aboutY ? o.rotateZ(R) : o.rotateY(R);
            break;
        case 'east':
            aboutY ? o.rotateZ(-R) : o.rotateY(-R);
            break;
        case 'north':
            aboutY ? o.rotateX(R) : null;
            break;
        case 'south':
            aboutY ? o.rotateX(-R) : o.rotateY(Math.PI);
            break;
        case 'down':
            aboutY && o.rotateX(Math.PI);
            break;
    }
}

/* ───────────────────────── Core meshes ───────────────────────────────────── */
function busMesh(b, tex) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.width_m * METERS_TO_UNITS,
            b.height_m * METERS_TO_UNITS,
            b.depth_m * METERS_TO_UNITS),
        new THREE.MeshPhongMaterial({map: tex.foil, color: 0xffffff, shininess: 80})
    );
    mesh.name = 'busMesh';
    return mesh;
}

// ----------- Apply Yaw/Pitch/Roll to the bus mesh -----------
export function updateBusOrientation(modelGroup, yawDeg = 0, pitchDeg = 0, rollDeg = 0) {
    const mesh = modelGroup;
    if (!mesh) return;
    const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(rollDeg || 0),    // X: Roll
        THREE.MathUtils.degToRad(pitchDeg || 0),   // Y: Pitch
        THREE.MathUtils.degToRad(yawDeg || 0),     // Z: Yaw
        'ZYX'
    );
    mesh.setRotationFromEuler(euler);
}

function panelGroup(l, t) {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({map: t.panel, side: THREE.DoubleSide});
    let count = 0;
    l.forEach(p => {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(p.length_m * METERS_TO_UNITS, p.width_m * METERS_TO_UNITS),
            m
        );
        mesh.position.set(...p.position_m.map(v => v * METERS_TO_UNITS));
        orient(mesh, p.orientation, false);
        // alternate +/‑ 60° tilt about X
        mesh.rotateX(count === 0 ? -Math.PI / 3 : Math.PI / 3);
        count++;
        // additional rotation
        g.add(mesh);
    });
    return g;
}

const texLdr = new THREE.TextureLoader();
const dishTex = texLdr.load('textures/dish_mesh.JPG');
dishTex.wrapS = dishTex.wrapT = THREE.ClampToEdgeWrapping;
const squareTex = texLdr.load('textures/square_dish_mesh.png');
squareTex.wrapS = squareTex.wrapT = THREE.ClampToEdgeWrapping;

const defaultAntennaMat = new THREE.MeshPhongMaterial({color: 0xffff00, shininess: 30, side: THREE.DoubleSide});

function antennaGroup(list, lbls) {
    const g = new THREE.Group();
    list.forEach(a => {
        let mesh;
        const R = a.radius_m * METERS_TO_UNITS;
        const colorMat = (a.color !== undefined)
            ? new THREE.MeshPhongMaterial({color: a.color, shininess: 30, side: THREE.DoubleSide})
            : defaultAntennaMat;
        if (a.type === 'dish') {
            const D = a.depth_m * METERS_TO_UNITS;
            const prof = [new THREE.Vector2(R, 0), new THREE.Vector2(0.8 * R, 0.5 * D), new THREE.Vector2(0.3 * R, 0.8 * D), new THREE.Vector2(0, D)];
            mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), colorMat);
        } else if (a.type === 'square_dish') {
            const w = R * 3, h = R * 3, d = a.depth_m * METERS_TO_UNITS, c = 0.25 * w;
            const s = new THREE.Shape();
            s.moveTo(-w / 2 + c, -h / 2);
            s.lineTo(w / 2 - c, -h / 2);
            s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + c);
            s.lineTo(w / 2, h / 2 - c);
            s.quadraticCurveTo(w / 2, h / 2, w / 2 - c, h / 2);
            s.lineTo(-w / 2 + c, h / 2);
            s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - c);
            s.lineTo(-w / 2, -h / 2 + c);
            s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + c, -h / 2);
            const geom = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: false});
            geom.center();
            geom.computeVertexNormals();
            mesh = new THREE.Mesh(geom, colorMat);
            mesh.rotation.x = -Math.PI / 2;
        } else {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 8), colorMat);
        }
        mesh.position.set(...a.position_m.map(v => v * METERS_TO_UNITS));
        if (a.orientation) orient(mesh, a.orientation);
        if (a.tilt_deg) mesh.rotateZ(THREE.MathUtils.degToRad(a.tilt_deg) * (a.orientation === 'west' ? 1 : -1));
        if (CSS2DObject) {
            const div = document.createElement('div');
            div.className = 'label';
            div.textContent = a.band === 'TT&C' ? 'TT&C' : `${a.band}-band`;
            const lbl = new CSS2DObject(div);
            lbl.position.set(0, R * 1.2, 0);
            mesh.add(lbl);
            lbls.push(lbl);
        }
        g.add(mesh);
    });
    return g;
}

function thrusterGroup(list) {
    const g = new THREE.Group(), m = new THREE.MeshPhongMaterial({color: 0x444444});
    list.forEach(t => {
        let mesh;
        const H = t.height_m * METERS_TO_UNITS;
        if (t.type === 'cylinder') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(t.radius_m * METERS_TO_UNITS, t.radius_m * METERS_TO_UNITS, H, 16), m);
        } else {
            mesh = new THREE.Mesh(new THREE.ConeGeometry(t.radius_bottom_m * METERS_TO_UNITS, H, 16), m);
            mesh.rotateX(Math.PI);
        }
        mesh.position.set(...t.position_m.map(v => v * METERS_TO_UNITS));
        if (t.orientation) orient(mesh, t.orientation);
        g.add(mesh);
    });
    return g;
}

/* ───────────────────────── Build satellite hierarchy ─────────────────────── */
function buildSatellite(g, tex, lbls) {
    const root = new THREE.Group();
    if (g.bus) root.add(busMesh(g.bus, tex));
    if (g.solar_panels) root.add(panelGroup(g.solar_panels, tex));
    if (g.antennas) root.add(antennaGroup(g.antennas, lbls));
    if (g.thrusters) root.add(thrusterGroup(g.thrusters));
    root.scale.set(0.25, 0.25, 0.25);
    return root;
}

/* ───────────────────────── Singleton state ──────────────────────────────── */
let currentSatModel = null;
const currentLabels = [];

/* ───────────────────────── Public: showSatellite ─────────────────────────── */
export async function showSatellite(noradId, scene, updatedNoradId) {
    if (!scene) throw new Error('showSatellite: scene is required');

    clearCurrentDetailedSat(scene);
    const url = `${SATELLITE_MODELS_BASE_URL}${updatedNoradId}.json`;

    try {
        let raw = await (window.fetchJSON || fetchJSON)(url);
        const sat = Array.isArray(raw) ? raw[0] : Object.values(raw)[0];
        if (!sat?.geometry) {
            console.warn('No geometry for NORAD', noradId);
            return null;
        }

        const tex = {foil: generateFoilTexture(4), panel: loadSolarTexture(3)};
        currentSatModel = buildSatellite(sat.geometry, tex, currentLabels);

        currentSatModel.userData = {
            updatedNoradId,
            meta: sat.meta || {},
            orbit: sat.orbit || {},
            attitude: sat.attitude || sat.meta?.attitude || {},
            capability: sat.attitudeCapability || {},
            payload: sat.payload || {},
            source: sat
        };

        scene.add(currentSatModel);

        const att = currentSatModel.userData.attitude;
        if (att) {
            updateBusOrientation(
                currentSatModel,
                att.yaw ?? 0,
                att.pitch ?? 0,
                att.roll ?? 0
            );
        }
        return currentSatModel;
    } catch (e) {
        console.error('showSatellite failed', e);
        return null;
    }
}

export function clearCurrentDetailedSat(scene) {
    if (currentSatModel && scene) scene.remove(currentSatModel);
    currentLabels.forEach(l => l.parent && l.parent.remove(l));
    currentLabels.length = 0;
    currentSatModel = null;
}

/* ——— fine‑grained transponder beams (unchanged) ----------------------------- */
const d2r = THREE.MathUtils.degToRad;

export function buildTransponderBeam(noradId, tr, satData, parent = null, opts = {}) {
    const halfDeg = opts.halfConeDeg ?? 2;
    const lenKm = opts.lengthKm ?? getNominalAltMeters(satData?.meta) / 1_000;
    const km2u = METERS_TO_UNITS * 1000, hU = lenKm * km2u, rU = Math.tan(d2r(halfDeg)) * lenKm * km2u;
    const geom = new THREE.ConeGeometry(rU, hU, 32, 1, true);
    geom.translate(0, -hU / 2, 0);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
        color: opts.color ?? 0x00c0ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(geom, mat);
    beam.userData = {noradId, transponder: tr.id ?? tr.name ?? '?'};
    if (parent) parent.add(beam);
    else if (satData?.satrec) {
        const now = new Date(), p = satellite.propagate(satData.satrec, now)?.position;
        if (p) beam.position.set(p.x * km2u, p.z * km2u, p.y * km2u);
    }
    beam.lookAt(new THREE.Vector3(0, 0, 0));
    return beam;
}

export function buildAllBeams(noradId, satData, tp, scene, opts = {}) {
    const group = new THREE.Group();
    if (!tp) return group;
    const push = (bKey, obj) => {
        const mesh = buildTransponderBeam(noradId, obj, satData, null, {halfConeDeg: 3});
        if (mesh) group.add(mesh);
    };
    for (const [bandKey, band] of Object.entries(tp)) {
        if (band.beam_classes) for (const [k, v] of Object.entries(band.beam_classes)) push(`${bandKey}/${k}`, {
            ...v,
            id: `${bandKey}/${k}`
        });
        if (band.spot_beams) for (const [k, v] of Object.entries(band.spot_beams)) push(`${bandKey}/${k}`, {
            ...v,
            id: `${bandKey}/${k}`
        });
    }
    if (scene) scene.add(group);
    return group;
}


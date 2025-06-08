// js/satelliteModelLoader.js  (ES‑module)   – visibility‑fix edition
// -----------------------------------------------------------------------------
// Build & display detailed satellite models + beam helpers
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import {fetchJSON} from './SatelliteConfigurationLoader.js';

/* ——— constants, helper getNominalAltMeters, texture caches ---------------- */
const EARTH_RADIUS_KM = 6371;
const EARTH_SCENE_RADIUS = 10;
const KM_TO_SCENE_UNITS = EARTH_SCENE_RADIUS / EARTH_RADIUS_KM;
const METERS_TO_UNITS = window.METERS_TO_SCENE_UNITS || 1.0;
const renderer = window.renderer || null;
export const SATELLITE_MODELS_BASE_URL = window.SATELLITE_MODELS_BASE_URL || 'json/satellites/';

function getNominalAltMeters(meta = {}) {
    const s = meta?.orbital_slot?.nominal ?? '';
    const m = /([\d.]+)\s*km/i.exec(s);
    return m ? parseFloat(m[1]) * 1_000 : 35_786e3;   // default GEO
}

const foilCache = new Map();
const panelCache = new Map();

function generateFoilTexture(rep = 4) {
    if (foilCache.has(rep)) return foilCache.get(rep);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d'), img = ctx.createImageData(512, 512);
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

/* ——— optional CSS2D renderer for labels ----------------------------------- */
let CSS2DObject;
try {
    ({CSS2DObject} = await import('three/addons/renderers/CSS2DRenderer.js'));
} catch {
    CSS2DObject = window.CSS2DObject;
}

/* ——— geometry helpers (unchanged except material tweaks) ------------------ */
function orient(o, d, aY = true) {
    const R = Math.PI / 2;
    switch (d) {
        case'west':
            aY ? o.rotateZ(R) : o.rotateY(R);
            break;
        case'east':
            aY ? o.rotateZ(-R) : o.rotateY(-R);
            break;
        case'north':
            aY ? o.rotateX(R) : null;
            break;
        case'south':
            aY ? o.rotateX(-R) : o.rotateY(Math.PI);
            break;
        case'down':
            aY && o.rotateX(Math.PI);
    }
}

function busMesh(b, t) {
    return new THREE.Mesh(new THREE.BoxGeometry(b.width_m * METERS_TO_UNITS, b.height_m * METERS_TO_UNITS, b.depth_m * METERS_TO_UNITS), new THREE.MeshPhongMaterial({
        map: t.foil,
        color: 0xffffff,
        shininess: 80
    }));
}

function panelGroup(l, t) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({map: t.panel, side: THREE.DoubleSide});
    l.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.length_m * METERS_TO_UNITS, p.width_m * METERS_TO_UNITS), m);
        mesh.position.set(...p.position_m.map(v => v * METERS_TO_UNITS));
        orient(mesh, p.orientation, false);
        g.add(mesh);
    });
    return g;
}

const texLdr = new THREE.TextureLoader();
const dishTex = texLdr.load('textures/dish_mesh.JPG');
dishTex.wrapS = dishTex.wrapT = THREE.ClampToEdgeWrapping;
const squareTex = texLdr.load('textures/square_dish_mesh.png');
squareTex.wrapS = squareTex.wrapT = THREE.ClampToEdgeWrapping;

function antennaGroup(list, lbls) {
    const g = new THREE.Group();
    const dishMat = new THREE.MeshPhongMaterial({map: dishTex, shininess: 20, side: THREE.DoubleSide});
    const squareMat = new THREE.MeshPhongMaterial({map: squareTex, shininess: 30, side: THREE.DoubleSide});
    const ttMat = new THREE.MeshPhongMaterial({color: 0xcccccc});

    list.forEach(a => {
        let mesh;
        const R = a.radius_m * METERS_TO_UNITS;
        if (a.type === 'dish') {
            const D = a.depth_m * METERS_TO_UNITS;
            const prof = [new THREE.Vector2(R, 0), new THREE.Vector2(0.8 * R, 0.5 * D), new THREE.Vector2(0.3 * R, 0.8 * D), new THREE.Vector2(0, D)];
            mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), dishMat);
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
            geom.computeBoundingBox();
            geom.center();
            geom.computeVertexNormals();   // <‑‑ added
            mesh = new THREE.Mesh(geom, squareMat);
            mesh.rotation.x = -Math.PI / 2;
        } else {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 8), ttMat);
        }

        mesh.position.set(...a.position_m.map(v => v * METERS_TO_UNITS));
        if (a.orientation) orient(mesh, a.orientation);
        if (a.tilt_deg) {
            mesh.rotateZ(THREE.MathUtils.degToRad(a.tilt_deg) * (a.orientation === 'west' ? 1 : -1));
        }

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

function buildSatellite(g, tex, lbls, font) {
    const root = new THREE.Group();
    if (g.bus) root.add(busMesh(g.bus, tex));
    if (g.solar_panels) root.add(panelGroup(g.solar_panels, tex));
    if (g.antennas) root.add(antennaGroup(g.antennas, lbls));
    if (g.thrusters) root.add(thrusterGroup(g.thrusters));
    //root.rotation.set(0, Math.PI / 3.75, Math.PI / 2);
    //root.scale.set(0.2, 0.2, 0.2);
    //root.add(new THREE.AxesHelper(1000));
    return root;
}

/* ——— singleton state & show/clear (unchanged) -------------------------------- */
let currentSatModel = null;
const currentLabels = [];

export async function showSatellite(noradId, scene) {
    if (!scene) throw new Error('showSatellite: scene is required');
    clearCurrentDetailedSat(scene);
    const url = `${SATELLITE_MODELS_BASE_URL}${noradId}.json`;
    console.log('satelliteModelLoader →', url);
    try {
        const raw = await (window.fetchJSON || fetchJSON)(url);
        const sat = Array.isArray(raw) ? raw[0] : Object.values(raw)[0];
        if (!sat?.geometry) {
            console.warn('No geometry for NORAD', noradId);
            return null;
        }
        const tex = {foil: generateFoilTexture(4), panel: loadSolarTexture(3)};
        currentSatModel = buildSatellite(sat.geometry, tex, currentLabels);
        currentSatModel.userData = {noradId, meta: sat.meta || {}, payload: sat.payload || {}, source: sat};
        scene.add(currentSatModel);
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

/* ——— beam helpers (identical logic, only comment trimmed for brevity) -------- */
const DEFAULT_BEAM_COLORS = {C: 0x33a1ff, Ku: 0xffa533, Ka: 0x9a33ff};

export async function buildBeamMesh(noradId, transponderId, opts = {}) {
    const {material, halfConeAngleDeg} = opts, url = `${SATELLITE_MODELS_BASE_URL}${noradId}.json`;
    let sat;
    try {
        const r = await fetchJSON(url);
        sat = Array.isArray(r) ? r[0] : Object.values(r)[0];
    } catch (e) {
        console.error('buildBeamMesh › load', e);
        return null;
    }
    if (!sat?.payload?.transponders) return null;
    const [bandKey, beamKey] = transponderId.split('/');
    const band = sat.payload.transponders[bandKey];
    if (!band) return null;
    const beam = band.beam_classes?.[beamKey] || band.spot_beams?.[beamKey];
    if (!beam) return null;
    const h_m = getNominalAltMeters(sat.meta);
    const theta = halfConeAngleDeg ?? {global: 17, hemi: 8, zone: 5, spot_1: 2, spot_2: 2, steerable: 2}[beamKey] ?? 17;
    const r_m = h_m * Math.tan(THREE.MathUtils.degToRad(theta));
    const hU = h_m * METERS_TO_UNITS, rU = r_m * METERS_TO_UNITS;
    const geom = new THREE.ConeGeometry(rU, hU, 32, 1, true);
    geom.translate(0, -hU / 2, 0);
    const mat = material ?? new THREE.MeshBasicMaterial({
        color: DEFAULT_BEAM_COLORS[bandKey] || 0xffffff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `${bandKey}-${beamKey}-beam`;
    mesh.userData = {noradId, band: bandKey, beamId: beamKey, beamSpec: beam};
    return mesh;
}

export async function buildAllBeamMeshes(noradId, opts = {}) {
    const {lookAt = new THREE.Vector3(0, 0, 0), ...pass} = opts, url = `${SATELLITE_MODELS_BASE_URL}${noradId}.json`;
    let sat;
    try {
        const r = await fetchJSON(url);
        sat = Array.isArray(r) ? r[0] : Object.values(r)[0];
    } catch (e) {
        console.error(e);
        return null;
    }
    const tp = sat?.payload?.transponders;
    if (!tp) return null;
    const g = new THREE.Group();
    g.name = `beams-${noradId}`;
    for (const [bandKey, band] of Object.entries(tp)) {
        const add = async (k) => {
            const m = await buildBeamMesh(noradId, `${bandKey}/${k}`, pass);
            if (m) {
                m.lookAt(lookAt);
                g.add(m);
            }
        };
        if (band.beam_classes) for (const k of Object.keys(band.beam_classes)) await add(k);
        if (band.spot_beams) for (const k of Object.keys(band.spot_beams)) await add(k);
    }
    return g;
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

export default {showSatellite, clearCurrentDetailedSat};

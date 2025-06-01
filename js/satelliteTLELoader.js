// js/satelliteTLELoader.js
// -----------------------------------------------------------
// Load TLE data (remote → backup → local) and build satellite
// sprites.  If the remote sprite icon fails, fall back to the
// LOCAL ./icons/ob_satellite.png before using a placeholder.
// -----------------------------------------------------------
import * as THREE from 'three';

// ---------------------------------------------------------------------------
//  URLs & constants
// ---------------------------------------------------------------------------
export const REMOTE_REPO_RAW = 'https://raw.githubusercontent.com/arcazj/openbexi_earth_orbit/master/';
export const REMOTE_TLE_BASE = `${REMOTE_REPO_RAW}json/tle/`;
export const LOCAL_TLE_BASE = './json/tle/';

// In‑memory store
const satStore = new Map();

export function updateSatellitePosition(ids, date = new Date(), earthRadius = 1) {
    const idList = Array.isArray(ids) ? ids.map(String) : [String(ids)];
    const sat = window.satellite;
    const results = [];

    idList.forEach((id) => {
        const entry = satStore.get(id);
        if (!entry) {
            console.warn(`No satellite with NORAD ID ${id}`);
            return;
        }

        const { satrec, mesh } = entry;
        const prop = sat.propagate(satrec, date);
        if (!prop || !prop.position) return;

        const gmst = sat.gstime(
            sat.jday(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1,
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            )
        );

        const geo = sat.eciToGeodetic(prop.position, gmst);
        const lat = sat.degreesLat(geo.latitude);
        const lon = sat.degreesLong(geo.longitude);
        const alt = geo.height; // km

        const radius = earthRadius + (alt / 6371) * earthRadius;
        const phi = ((90 - lat) * Math.PI) / 180;
        const theta = ((lon + 180) * Math.PI) / 180;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        if (mesh) mesh.position.set(x, y, z);

        results.push({ noradId: id, lat, lon, alt, x, y, z, date });
    });

    return results;
}


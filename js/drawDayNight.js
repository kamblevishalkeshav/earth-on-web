/*  drawDayNight.js
    ──────────────────────────────────────────────────────────────
    • drawDayNightMercator(ctx,w,h,date) – paint night-side on a Mercator map
    • drawDayNight3D(scene, earthMesh, date) – real-time sun-light for 3-D globe
*/

import * as THREE from 'three';

/* ≡≡ Quick-and-clean solar position (accuracy ≈0.25°) ≡≡ */
function sunEciUnit(date) {
    const d = (Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
    ) / 86400000) - 10957.5;                // days since J2000
    const g  = THREE.MathUtils.degToRad((357.529 + 0.98560028 * d) % 360); // mean anomaly
    const q  = THREE.MathUtils.degToRad((280.459 + 0.98564736 * d) % 360); // mean longitude
    const L  = q + THREE.MathUtils.degToRad(1.915) * Math.sin(g)
        + THREE.MathUtils.degToRad(0.020) * Math.sin(2*g);        // ecliptic longitude
    const e  = THREE.MathUtils.degToRad(23.439 - 0.00000036 * d);          // obliquity
    const xs = Math.cos(L);
    const ys = Math.cos(e) * Math.sin(L);
    const zs = Math.sin(e) * Math.sin(L);
    return new THREE.Vector3(xs, ys, zs).normalize();                      // in ECI
}

/* ≡≡ Convert ECI → ECF unit-vector using GMST (rad) ≡≡ */
function eciToEcf(vecEci, gmst) {
    return new THREE.Vector3(
        vecEci.x *  Math.cos(gmst) + vecEci.y * Math.sin(gmst),
        -vecEci.x *  Math.sin(gmst) + vecEci.y * Math.cos(gmst),
        vecEci.z
    ).normalize();
}

/* ------------------------------------------------------------------ */
/* 2-D  Mercator shade                                                */
/* ------------------------------------------------------------------ */
export function drawDayNightMercator(ctx, width, height, date) {
    /* sun sub-point (lat,lon) */
    const jd = window.satellite.jday(
        date.getUTCFullYear(), date.getUTCMonth()+1, date.getUTCDate(),
        date.getUTCHours(),     date.getUTCMinutes(), date.getUTCSeconds()
    );
    const gmst = window.satellite.gstime(jd);
    const sunEcf = eciToEcf(sunEciUnit(date), gmst);
    const subLat = Math.asin(  sunEcf.z);
    const subLon = Math.atan2(-sunEcf.y, sunEcf.x);

    /* draw night-side as semi-transparent overlay */
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();

    const pts = [];
    for (let x = 0; x <= width; ++x) {
        const lon = (x / width) * 2*Math.PI - Math.PI;
        const lat = Math.atan( -Math.cos(lon - subLon) / Math.tan(subLat) );
        const mercY = height/2 - width * Math.log(Math.tan(Math.PI/4 + lat/2)) / (2*Math.PI);
        pts.push({x, y: mercY});
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    /* close the polygon on the night-side */
    if (subLat > 0) { ctx.lineTo(width, height); ctx.lineTo(0,      height); }
    else            { ctx.lineTo(width, 0);      ctx.lineTo(0,      0);      }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

let sunLight = null;                                    // cached light
const AU = 149_597_870;                                 // km (arbitrary)

export function drawDayNight3D(scene, earthMesh, date = new Date()) {
    if (!scene || !earthMesh) return;

    if (!sunLight) {
        sunLight       = new THREE.DirectionalLight(0xffffff, 1.0);
        sunLight.name  = 'sunLight';
        sunLight.castShadow = false;
        scene.add(sunLight);
        sunLight.target = earthMesh;
    }

    const jd      = date.valueOf() / 86400000 + 2440587.5;
    const gmst    = gmstFromJD(jd);
    const sECF    = eciToEcf(sunECI(jd), gmst);

    sunLight.position.set(
        sECF.x * AU,
        sECF.z * AU,   // swap Y↔Z : scene is X-Z-Y
        sECF.y * AU
    );
}

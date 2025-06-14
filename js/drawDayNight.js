/*  drawDayNight.js
    ──────────────────────────────────────────────────────────────
    • drawDayNightMercator(ctx,w,h,date) – paint night-side on a Mercator map
    • drawDayNight3D(scene, earthMesh, date) – real-time sun-light for 3-D globe
*/

import * as THREE from 'three';

/* ≡≡ Sun position in ECI frame from Date using NOAA SPA (high accuracy) ≡≡ */
function sunEciUnit(date) {
    const jd = date.valueOf() / 86400000 + 2440587.5;
    return sunECI(jd);
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

/* ≡≡ Greenwich Mean Sidereal Time from Julian Day (rad) ≡≡ */
export function gmstFromJD(jd) {
    const T  = (jd - 2451545.0) / 36525.0;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * T * T - (T * T * T) / 38710000;
    gmst = ((gmst % 360) + 360) % 360; // wrap 0-360
    return THREE.MathUtils.degToRad(gmst);
}

/* ≡≡ Sun position in ECI frame (unit vector) from Julian Day ≡≡ */
export function sunECI(jd) {
    const T   = (jd - 2451545.0) / 36525.0;                     // Julian centuries since J2000
    const L0  = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    const M   = (357.52911 + T * (35999.05029 - 0.0001537 * T)) % 360;
    const C   = Math.sin(THREE.MathUtils.degToRad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T))
              + Math.sin(THREE.MathUtils.degToRad(2 * M)) * (0.019993 - 0.000101 * T)
              + Math.sin(THREE.MathUtils.degToRad(3 * M)) * 0.000289;            // equation of center
    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * T;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(THREE.MathUtils.degToRad(omega));
    const epsilon0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - 0.001813 * T))) / 60) / 60;
    const epsilon  = epsilon0 + 0.00256 * Math.cos(THREE.MathUtils.degToRad(omega));
    const lambdaRad  = THREE.MathUtils.degToRad(lambda);
    const epsilonRad = THREE.MathUtils.degToRad(epsilon);

    const x = Math.cos(lambdaRad);
    const y = Math.cos(epsilonRad) * Math.sin(lambdaRad);
    const z = Math.sin(epsilonRad) * Math.sin(lambdaRad);
    return new THREE.Vector3(x, y, z).normalize();
}

// mercatorMapLoader.js

import {
    earthConfig,
    getFullGitHubUrl,
    GITHUB_REPO_RAW_BASE_URL,
    satelliteConfig
} from './SatelliteConfigurationLoader.js';
import {satellites} from './satelliteTLELoader.js';
import {drawDayNightMercator} from './drawDayNight.js';

export let mercatorContainer, mercatorCanvasElement, mapBackgroundDiv;
export let mercatorCtx, mapWidth = 400, mapHeight = 200;
let mercatorSatIcon = new Image();
let mercatorSatIconLoaded = false;

export function initMercatorView() {
    mercatorContainer = document.getElementById("mercatorContainer");
    mapBackgroundDiv = mercatorContainer.querySelector(".mapBackground");
    mercatorCanvasElement = document.getElementById("mercatorCanvas");

    mapWidth = mapBackgroundDiv.clientWidth;
    mapHeight = mapBackgroundDiv.clientHeight;
    mercatorCanvasElement.width = mapWidth;
    mercatorCanvasElement.height = mapHeight;
    mercatorCtx = mercatorCanvasElement.getContext("2d");

    const remoteMapBgUrl = earthConfig.textureLight;

    if (remoteMapBgUrl) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            mapBackgroundDiv.style.backgroundImage = `url(${remoteMapBgUrl})`;
            mapBackgroundDiv.classList.remove('fallback-css');
            console.log("Mercator map background texture loaded:", remoteMapBgUrl);
        };
        img.onerror = () => {
            console.warn(`Mercator map background '${remoteMapBgUrl}' failed. Applying CSS fallback.`);
            mapBackgroundDiv.classList.add('fallback-css');
        };
        img.src = remoteMapBgUrl;
    } else {
        console.warn("Mercator map background URL is null. Applying CSS fallback.");
        mapBackgroundDiv.classList.add('fallback-css');
    }

    const mercatorIconFullUrl = getFullGitHubUrl(satelliteConfig.mercatorIcon || 'icons/ob_satellite.png', GITHUB_REPO_RAW_BASE_URL);
    if (mercatorIconFullUrl) {
        mercatorSatIcon.crossOrigin = "Anonymous";
        mercatorSatIcon.onload = () => {
            mercatorSatIconLoaded = true;
            console.log("Mercator satellite icon loaded from:", mercatorSatIcon.src);
        };
        mercatorSatIcon.onerror = () => {
            console.error("Mercator satellite icon failed to load from:", mercatorIconFullUrl, ". Using placeholder.");
            mercatorSatIcon.src = 'https://placehold.co/16x16/ffffff/000000?text=S';
            mercatorSatIcon.onload = () => {
                mercatorSatIconLoaded = true;
            };
        };
        mercatorSatIcon.src = mercatorIconFullUrl;
    } else {
        console.error("Mercator satellite icon path is null. Using placeholder.");
        mercatorSatIcon.src = 'https://placehold.co/16x16/ffffff/000000?text=S';
        mercatorSatIcon.onload = () => {
            mercatorSatIconLoaded = true;
        };
    }
}

export function updateMercatorMap(simParams) {
    if (!mercatorCtx || !mercatorCanvasElement || mercatorContainer.style.display === 'none') return;

    mercatorCtx.clearRect(0, 0, mercatorCanvasElement.width, mercatorCanvasElement.height);

    if (simParams.showDayNight) {
        drawDayNightMercator(mercatorCtx, mercatorCanvasElement.width, mercatorCanvasElement.height, simParams.simDate);
    }

    const now = new Date();
    const jdayNow = satellite.jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    const gmstNow = satellite.gstime(jdayNow);
    let labelPositions = [];

    const satDrawData = satellites
        .filter(sat => sat.mesh && sat.mesh.visible && sat.satrec)
        .map(sat => {
            try {
                const posVel = satellite.propagate(sat.satrec, now);
                if (!posVel || !posVel.position) return null;
                const geo = satellite.eciToGeodetic(posVel.position, gmstNow);
                const pt = latLonToMercator(satellite.degreesLat(geo.latitude), satellite.degreesLong(geo.longitude));
                return {sat, pt, name: sat.satellite_name};
            } catch (e) {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.pt.y - b.pt.y);

    satDrawData.forEach(data => {
        const {sat, pt, name} = data;
        const iconSize = 12;
        const leaderLength = 15;
        const textPadding = {x: 5, y: 3};

        if (mercatorSatIconLoaded && mercatorSatIcon.complete && mercatorSatIcon.naturalHeight !== 0) {
            mercatorCtx.drawImage(mercatorSatIcon, pt.x - iconSize / 2, pt.y - iconSize / 2, iconSize, iconSize);
        } else {
            mercatorCtx.beginPath();
            mercatorCtx.arc(pt.x, pt.y, iconSize / 2, 0, 2 * Math.PI);
            mercatorCtx.fillStyle = sat.isSelected ? "rgba(255,0,0,0.8)" : "rgba(0,255,0,0.8)";
            mercatorCtx.fill();
        }

        mercatorCtx.font = sat.isSelected ? "bold 11px Arial" : "10px Arial";
        const textMetrics = mercatorCtx.measureText(name);
        const labelWidth = textMetrics.width + 2 * textPadding.x;
        const labelHeight = 12 + 2 * textPadding.y;

        const angles = [-Math.PI / 4, -Math.PI / 2, -3 * Math.PI / 4, Math.PI, 3 * Math.PI / 4, Math.PI / 2, Math.PI / 4, 0];
        let bestPos = null;

        for (const angle of angles) {
            const leaderEndX = pt.x + (iconSize / 2 + leaderLength) * Math.cos(angle);
            const leaderEndY = pt.y + (iconSize / 2 + leaderLength) * Math.sin(angle);
            let textX = leaderEndX + ((Math.cos(angle) >= 0 || Math.abs(Math.cos(angle)) < 0.1) ? textPadding.x : -labelWidth + textPadding.x);
            let textY = leaderEndY - labelHeight / 2;
            const currentLabelRect = {
                x: textX - textPadding.x,
                y: textY - textPadding.y,
                width: labelWidth,
                height: labelHeight
            };

            let isOverlapping = labelPositions.some(lp =>
                currentLabelRect.x < lp.x + lp.width && currentLabelRect.x + currentLabelRect.width > lp.x &&
                currentLabelRect.y < lp.y + lp.height && currentLabelRect.y + currentLabelRect.height > lp.y);

            if (!isOverlapping) {
                bestPos = {leaderEndX, leaderEndY, textX, textY, labelRect: currentLabelRect};
                break;
            }
        }

        if (bestPos) {
            labelPositions.push(bestPos.labelRect);
            mercatorCtx.beginPath();
            mercatorCtx.moveTo(pt.x, pt.y);
            mercatorCtx.lineTo(bestPos.leaderEndX, bestPos.leaderEndY);
            mercatorCtx.strokeStyle = "rgba(200, 200, 200, 0.7)";
            mercatorCtx.lineWidth = 1;
            mercatorCtx.stroke();
            mercatorCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
            mercatorCtx.fillRect(bestPos.labelRect.x, bestPos.labelRect.y, bestPos.labelRect.width, bestPos.labelRect.height);
            mercatorCtx.fillStyle = sat.isSelected ? "#ff8080" : "#00ddff";
            mercatorCtx.textAlign = "left";
            mercatorCtx.textBaseline = "middle";
            mercatorCtx.fillText(name, bestPos.textX, bestPos.textY + labelHeight / 2 - textPadding.y / 2 + 1);
        } else {
            mercatorCtx.fillStyle = sat.isSelected ? "#ff4444" : "#00aaff";
            mercatorCtx.textAlign = "center";
            mercatorCtx.textBaseline = "bottom";
            mercatorCtx.fillText(name, pt.x, pt.y - iconSize / 2 - 2);
        }
    });
}

function latLonToMercator(latDeg, lonDeg) {
    const currentWidth = mercatorCanvasElement ? mercatorCanvasElement.width : mapWidth;
    const currentHeight = mercatorCanvasElement ? mercatorCanvasElement.height : mapHeight;
    const x = (lonDeg + 180) * (currentWidth / 360);
    const clampedLatDeg = Math.max(-85.05112878, Math.min(85.05112878, latDeg));
    const latRad = clampedLatDeg * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (currentHeight / 2) - (currentWidth * mercN / (2 * Math.PI));
    return {x, y};
}


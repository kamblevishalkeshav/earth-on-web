// SatelliteConfigurationLoader.js
// Load satellite visualization configuration from GitHub or local fallback

import {EARTH_RADIUS_KM, EARTH_SCENE_RADIUS} from './SatelliteConstantLoader.js';
export let earthConfig, constantsConfig, satelliteConfig, sceneConfig, controlsConfig;
export let usingLocalAssets = false;

/**
 * Dynamically resolves a full URL, either from GitHub or local assets.
 * @param {string} rel - Relative path (e.g., "textures/earth.jpg")
 * @param {string} base - Base URL (e.g., GITHUB_REPO_RAW_BASE_URL)
 * @returns {string|null}
 */
export function getFullGitHubUrl(relativePath, base) {
    if (!relativePath || typeof relativePath !== 'string') {
        console.warn("getFullGitHubUrl: received invalid path:", relativePath);
        return usingLocalAssets ? relativePath.replace(/^\//, '') : null;
    }
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }
    if (usingLocalAssets) {
        return relativePath.replace(/^\//, '');
    }
    return base + relativePath.replace(/^\//, '');
}

/**
 * Loads JSON from a URL with graceful fallback.
 * @param {string} url
 * @returns {Promise<object|Array>}
 */
export async function fetchJSON(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return await r.json();
    } catch (err) {
        return url.includes('/tle/') ? [] : {};
    }
}

/**
 * Load all required configuration files for satellite visualization.
 * @param {string} GITHUB_REPO_RAW_BASE_URL
 * @returns {Promise<object>}
 */
export async function loadConfigs(GITHUB_REPO_RAW_BASE_URL) {
    let CONFIG_BASE_URL = GITHUB_REPO_RAW_BASE_URL + "config/";
    let TLE_BASE_URL = GITHUB_REPO_RAW_BASE_URL + "json/tle/";
    let SATELLITES_BASE_URL = GITHUB_REPO_RAW_BASE_URL + "json/satellites/";

    try {
        const results = await Promise.all([
            fetchJSON(CONFIG_BASE_URL + 'earth.json'),
            fetchJSON(CONFIG_BASE_URL + 'constants.json'),
            fetchJSON(CONFIG_BASE_URL + 'satellite.json'),
            fetchJSON(CONFIG_BASE_URL + 'scene.json'),
            fetchJSON(CONFIG_BASE_URL + 'controls.json')
        ]);
        [earthConfig, constantsConfig, satelliteConfig, sceneConfig, controlsConfig] = results;

        if (!earthConfig || Object.keys(earthConfig).length === 0) throw new Error("Empty config");
    } catch {
        usingLocalAssets = true;
        CONFIG_BASE_URL = "config/";
        TLE_BASE_URL = "json/tle/";
        SATELLITES_BASE_URL = "json/satellites/";

        try {
            const results = await Promise.all([
                fetchJSON(CONFIG_BASE_URL + 'earth.json'),
                fetchJSON(CONFIG_BASE_URL + 'constants.json'),
                fetchJSON(CONFIG_BASE_URL + 'satellite.json'),
                fetchJSON(CONFIG_BASE_URL + 'scene.json'),
                fetchJSON(CONFIG_BASE_URL + 'controls.json')
            ]);
            [earthConfig, constantsConfig, satelliteConfig, sceneConfig, controlsConfig] = results;

            if (!earthConfig || Object.keys(earthConfig).length === 0) throw new Error("Local config empty");
        } catch {
            earthConfig = {
                diameter: EARTH_RADIUS_KM * 2,
                texture: 'textures/1_earth_16k.jpg',
                textureLight: 'textures/earthmap1k_light.jpg'
            };
            satelliteConfig = {
                icon: 'icons/ob_satellite.png',
                scale: [0.1, 0.1, 0.1],
                mercatorIcon: 'icons/ob_satellite.png'
            };
            sceneConfig = {
                camera: {fov: 45, near: 0.1, far: 1000, position: [0, 0, 30]},
                ambientLight: {color: 0xffffff, intensity: 0.5},
                directionalLight: {color: 0xffffff, intensity: 1, position: [5, 3, 5]}
            };
            controlsConfig = {enableDamping: true, dampingFactor: 0.05};
            constantsConfig = {};
        }
    }

    // Final fallback/default fills
    earthConfig.diameter ||= EARTH_RADIUS_KM * 2;
    earthConfig.texture ||= 'textures/1_earth_16k.jpg';
    earthConfig.textureLight ||= 'textures/earthmap1k_light.jpg';
    satelliteConfig.icon ||= 'icons/ob_satellite.png';
    satelliteConfig.scale ||= [0.1, 0.1, 0.1];
    satelliteConfig.mercatorIcon ||= 'icons/ob_satellite.png';
    sceneConfig.camera ||= {fov: 45, near: 0.1, far: 1000, position: [0, 0, 30]};
    sceneConfig.ambientLight ||= {color: 0xffffff, intensity: 0.5};
    sceneConfig.directionalLight ||= {color: 0xffffff, intensity: 1, position: [5, 3, 5]};
    controlsConfig.enableDamping ??= true;
    controlsConfig.dampingFactor ||= 0.05;

    const globalScale = EARTH_SCENE_RADIUS / (earthConfig.diameter / 2);

    return {
        CONFIG_BASE_URL,
        TLE_BASE_URL,
        SATELLITES_BASE_URL,
        earthConfig,
        constantsConfig,
        satelliteConfig,
        sceneConfig,
        controlsConfig,
        globalScale,
    };
}

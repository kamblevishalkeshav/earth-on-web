// js/satelliteTLELoader.js
// -----------------------------------------------------------
import * as THREE from 'three';
import {KM_TO_SCENE_UNITS} from './SatelliteConstantLoader.js';
import {
    satelliteConfig,
    fetchJSON,
    getFullGitHubUrl, GITHUB_REPO_RAW_BASE_URL,
} from './SatelliteConfigurationLoader.js';

export let satellites = [];
let orbitLine = null;
export let usingLocalAssets = false;
let textureLoader = new THREE.TextureLoader();

export function updateOrbitTrajectory(scene, simParams, satData) {
    if (!simParams.showOrbit || !satData || !satData.satrec) return;

    //How to set getOrbitECIPoints? :
    //let currentTime = new Date();
    //const orbitDurationHours = 6; // Generate 6 hours of orbit path
    //const endTime = new Date(currentTime.getTime() + orbitDurationHours * 60 * 60 * 1000);
    //const timeStep = 1; // Calculate a point every 1 minute
    //const orbitECIPoints= getOrbitECIPoints(satData.tle_line1, satData.tle_line2, currentTime, endTime, timeStep);

    const meanMotion = satData.satrec.no;
    const basePeriod = (2 * Math.PI) / meanMotion; // fundamental orbital period in minutes

    let orbitType, periodMinutes;
    if (basePeriod > 1400 && basePeriod < 1470) {
        orbitType = 'GEO';
        periodMinutes = basePeriod; // one revolution
    } else if (basePeriod < 225) {
        orbitType = 'LEO';
        periodMinutes = (24 * Math.PI) / meanMotion; // 12 revs
    } else {
        orbitType = 'MEO';
        periodMinutes = (4 * Math.PI) / meanMotion; // 2 revs
    }

    const numPoints = 360;
    const deltaT = periodMinutes / numPoints;
    const now = new Date();
    const orbitPoints = [];

    for (let i = 0; i <= numPoints; i++) {
        const t = new Date(now.getTime() + i * deltaT * 60000);
        const pv = satellite.propagate(satData.satrec, t);
        if (!pv || !pv.position) continue;

        let pos = pv.position;
        if (orbitType !== 'GEO') {
            const gmst = satellite.gstime(t);
            pos = satellite.eciToEcf(pos, gmst);
        }

        const scale = KM_TO_SCENE_UNITS;
        orbitPoints.push(new THREE.Vector3(
            pos.x * scale,
            pos.z * scale,
            pos.y * scale
        ));
    }

    if (typeof orbitLine !== 'undefined' && orbitLine) {
        scene.remove(orbitLine);
        orbitLine.geometry.dispose();
        orbitLine.material.dispose();
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const material = new THREE.LineBasicMaterial({
        color: orbitType === 'GEO' ? 0xff0000 : 0xff0000
    });

    orbitLine = new THREE.Line(geometry, material);
    scene.add(orbitLine);
    return orbitLine;
}

function processSatellites(scene, tleData, baseMaterial) {
    if (tleData.length === 0) return null;
    // Clear existing satellites from scene and array
    satellites.forEach(s => {
        if (s.mesh) scene.remove(s.mesh);
        // If s.label and s.label.element, handle removal if CSS2DObjects were used for sprites
    });
    satellites.length = 0; // Empty the array

    if (!tleData || tleData.length === 0) {
        console.warn("No TLE data to process.");
        if (typeof updateSatelliteList === "function") updateSatelliteList(); // Update UI
        return;
    }
    if (!baseMaterial) {
        console.error("Base material for satellites is not available. Cannot create satellite sprites.");
        if (typeof updateSatelliteList === "function") updateSatelliteList(); // Update UI
        return;
    }

    tleData.forEach(item => {
        const {company, satellite_name, norad_id, type, launch_date, tle_line1, tle_line2} = item;
        if (!tle_line1 || !tle_line2) {
            console.warn(`Skipping satellite ${satellite_name || norad_id}: missing TLE line1 or line2.`);
            return;
        }
        try {
            const satrec = satellite.twoline2satrec(tle_line1, tle_line2);
            // Check for common error: epoch year. satellite.js might parse ' yyddd...' as 19yy if yy > 56.
            // Modern TLEs use 'yyddd...'. If satrec.epochyr < 2000 (and yy > 56), it's likely 20yy.
            // This is a heuristic. satellite.js handles most cases, but good to be aware.
            // No direct fix here, assuming satellite.js handles it.

            if (!satrec) { // satellite.js returns false if TLE is fundamentally invalid
                throw new Error("Failed to parse TLE (twoline2satrec returned false).");
            }


            const sprite = new THREE.Sprite(baseMaterial.clone()); // Clone material for individual control if needed
            sprite.scale.set(...(satelliteConfig.scale || [0.1, 0.1, 0.1]));
            scene.add(sprite);

            satellites.push({
                mesh: sprite, // The THREE.Sprite object
                satrec: satrec, // The parsed TLE data from satellite.js
                orbitType: type || "N/A",
                company: company || "N/A",
                satellite_name: satellite_name || `NORAD ${norad_id}`, // Use NORAD ID if name is missing
                norad_id: norad_id,
                launch_date: launch_date || "N/A",
                tle_line1: tle_line1,
                tle_line2: tle_line2,
                isSelected: false // Track selection state
            });
        } catch (e) {
            console.error(`Error processing TLE for ${satellite_name || norad_id} (NORAD: ${norad_id}): ${e.message}. TLE1: ${tle_line1}, TLE2: ${tle_line2}`);
            // Optionally, skip adding this satellite or add it with an error state
        }
    });
    console.log(`${satellites.length} satellites processed and added to the scene.`);
    //if (typeof updateSatelliteList === "function") updateSatelliteList(); // Update UI elements
}


export async function setupTLESatellites(scene) {
    let TLE_BASE_URL = "json/tle/";
    console.log("Attempting to load TLE data from:", TLE_BASE_URL);
    const primaryTleUrl = TLE_BASE_URL + 'TLE.json';

    try {
        let tleData = await fetchJSON(primaryTleUrl);

        if (!Array.isArray(tleData) || tleData.length === 0) {
            //console.warn(`TLE data from ${primaryTleUrl} failed or is empty.`);
            // If primary GitHub fails AND we are not already in local mode, try backup GitHub URL
            if (!usingLocalAssets) {
                const backupTleUrl = GITHUB_REPO_RAW_BASE_URL + "json/tle/" + 'TLE.json'; // Assuming backup is in the same base
                console.log("Attempting backup TLE from GitHub:", backupTleUrl);
                tleData = await fetchJSON(backupTleUrl);
                if (!Array.isArray(tleData) || tleData.length === 0) {
                    console.warn(`Backup TLE data from ${backupTleUrl} also failed or is empty.`);
                } else {
                    console.log("Loaded TLE data from GitHub backup source.");
                }
            }
            // If still no data (either local failed, or both GitHub primary/backup failed)
            if (!Array.isArray(tleData) || tleData.length === 0) {
                const userMessage = "Critical Error: Failed to load satellite TLE data from all available sources. Satellites will not be displayed.";
                console.error(userMessage);
                // Display user-facing error
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = "position:fixed; top:10px; left:10px; padding:10px; background:red; color:white; z-index:1000;";
                errorDiv.innerText = userMessage;
                document.body.appendChild(errorDiv);
                // No need for setTimeout, this is a critical error.
                satellites = processSatellites(scene, [], null); // Process with empty data
                return
            }
        }

        const satIconFullUrl = getFullGitHubUrl('icons/ob_satellite.png', GITHUB_REPO_RAW_BASE_URL);
        let satMaterial;

        if (!satIconFullUrl) {
            console.error("3D Satellite icon path is null (check satelliteConfig.icon). Using placeholder material.");
            // Create a very simple placeholder material if texture path is null
            const placeholderCanvas = document.createElement('canvas');
            placeholderCanvas.width = 32;
            placeholderCanvas.height = 32;
            const ctx = placeholderCanvas.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 16, 16);
            const placeholderTexture = new THREE.CanvasTexture(placeholderCanvas);
            satMaterial = new THREE.SpriteMaterial({map: placeholderTexture});
        } else {
            satMaterial = new THREE.SpriteMaterial({
                map: textureLoader.load(satIconFullUrl,
                    () => { /* onLoad */
                        console.log("3D Satellite icon loaded from:", satIconFullUrl);
                    },
                    undefined, // onProgress
                    (err) => { // onError
                        console.error('Error loading 3D satellite icon from:', satIconFullUrl, err, '. Using placeholder.');
                        if (satMaterial) { // Ensure satMaterial exists
                            const errorPlaceholderUrl = 'https://placehold.co/32x32/ff0000/ffffff?text=S_ERR';
                            satMaterial.map = textureLoader.load(errorPlaceholderUrl); // Load placeholder
                            satMaterial.needsUpdate = true;
                        }
                    })
            });
        }
        processSatellites(scene, tleData, satMaterial);

    } catch (err) {
        console.error("Error in setupTLESatellites (fetching/processing TLEs):", err);
        const userMessage = "Error setting up satellite data. Some satellites may not display correctly. Check console for details.";
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = "position:fixed; top:10px; left:10px; padding:10px; background:orange; color:black; z-index:1000;";
        errorDiv.innerText = userMessage;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
        processSatellites(scene, [], null); // Attempt to continue with empty data
    }
}

export function removeAllGeometry(scene) {
    if (orbitLine) {
        scene.remove(orbitLine);
        orbitLine.geometry.dispose();
        orbitLine.material.dispose();
        orbitLine = null;
    }
    // Add removal for other types of geometry if needed
}

export function getOrbitECIPoints(tleLine1, tleLine2, startTime, endTime, timeStepMinutes) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    // Error handling for TLE parsing
    if (!satrec) {
        console.error("Error: Could not parse TLE data.");
        // Depending on application flow, might return null, an empty array, or throw an error
        return;
    }
    // Check for specific TLE parsing errors if satrec.error is populated by twoline2satrec
    // (Note: satellite.js typically sets satrec.error during propagation, not always during parsing)

    let orbitECIPoints = null;
    let currentTime = new Date(startTime.getTime()); // Create a mutable copy of startTime

    while (currentTime <= endTime) {
        // Propagate to the current time to get ECI position and velocity
        // The position is in ECI coordinates (TEME frame), in kilometers.
        const positionAndVelocity = satellite.propagate(satrec, currentTime);

        if (positionAndVelocity && typeof positionAndVelocity.position === 'object' && positionAndVelocity.position !== null) {
            // Add the ECI position object {x, y, z} to our array
            orbitECIPoints.push(positionAndVelocity.position);
        } else {
            // Propagation might fail if, for example, the satellite has decayed
            // satrec.error provides a numerical code for the error type
            // (Refer to satellite.js documentation for SatRecError enum values)
            let errorMessage = "Propagation failed";
            if (satrec.error && satellite.SatRecError) { // Check if SatRecError enum exists
                // Attempt to get a string representation if available (not standard in satellite.js)
                // Or handle based on numeric satrec.error codes directly
                switch (satrec.error) {
                    case satellite.SatRecError.Ok: // Should not happen if positionAndVelocity is null/invalid
                        errorMessage = "Propagation OK but no position data.";
                        break;
                    case satellite.SatRecError.MeanElements:
                        errorMessage = "Propagation failed: Mean elements, check TLE.";
                        break;
                    case satellite.SatRecError.LockheedProp:
                        errorMessage = "Propagation failed: Lockheed propagator error.";
                        break;
                    case satellite.SatRecError.NearSingular:
                        errorMessage = "Propagation failed: Near singular elements.";
                        break;
                    case satellite.SatRecError.NoSupport:
                        errorMessage = "Propagation failed: No support for this TLE.";
                        break;
                    case satellite.SatRecError.Recovered:
                        errorMessage = "Propagation recovered but position might be suspect.";
                        // Decide if to include this point or not
                        break;
                    case satellite.SatRecError.Decayed:
                        errorMessage = `Satellite decayed at or before ${currentTime.toISOString()}. No further points will be generated.`;
                        console.warn(errorMessage);
                        // Optionally, break the loop if the satellite has decayed
                        // and no further valid points can be generated.
                        return orbitECIPoints; // Return points up to decay
                    default:
                        errorMessage = `Propagation failed with error code ${satrec.error}.`;
                }
            }
            console.warn(`Warning for satellite defined by TLE starting with "${tleLine1.substring(0, 20)}..." at ${currentTime.toISOString()}: ${errorMessage}`);
            // Depending on requirements, one might choose to break, continue, or push a null/special marker.
            // For a continuous orbit line, it's often better to stop generating points after a persistent failure.
        }

        // Increment current time by the time step
        currentTime.setMinutes(currentTime.getMinutes() + timeStepMinutes);
    }

    // Return the array of ECI coordinate points
    return orbitECIPoints;
}

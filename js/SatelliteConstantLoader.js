// SatelliteConstantLoader.js
// Central hub for constants shared by satellite‑loading modules.

// SatelliteConstantLoader.js
export const WGS84_A_KM = 6378.137;            // equatorial radius (a)
export const WGS84_F    = 1 / 298.257223563;   // flattening
export const WGS84_B_KM = WGS84_A_KM * (1 - WGS84_F);

export const EARTH_RADIUS_KM   = WGS84_A_KM;           // keep the old name for painless imports
export const KM_TO_SCENE_UNITS = 1 / 1000;             // unchanged
export const EARTH_SCENE_RADIUS = WGS84_A_KM * KM_TO_SCENE_UNITS;

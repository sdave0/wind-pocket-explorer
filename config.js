import * as THREE from 'three';

export const CONFIG = {
    EARTH_RADIUS: 5,
    CAMERA_START_Z: 12,
    MIN_HOUR: 1,
    MAX_HOUR: 23,
    BALLOON_GEOMETRY: new THREE.SphereGeometry(0.03, 8, 8),
    // Wind Pocket Detection Parameters
    GRID_DIVISIONS: 60,
    MIN_SPEED_KMH: 100,
    MIN_BALLOONS_IN_POCKET: 3,
    DIRECTION_SIMILARITY_THRESHOLD: 0.8,
    POCKET_MARKER_HEIGHT: 1.5,
    POCKET_MARKER_RADIUS: 0.15,
    LAYER_CONFIG: {
        high: { min: 10 },
        mid: { min: 5 },
        low: { min: 2 }
    },
    INTENSITY_LEVELS: {
        high: { minSpeed: 200, color: 0xff4444 },
        mid: { minSpeed: 150, color: 0xffff44 },
        slow: { minSpeed: 100, color: 0x4444ff }
    },
    POCKET_WEATHER_ALTITUDE_PRESSURE: 250
};

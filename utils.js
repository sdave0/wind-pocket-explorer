import * as THREE from 'three';
import { CONFIG } from './config.js';

export function getLayer(alt) {
    if (alt > CONFIG.LAYER_CONFIG.high.min) return 'high';
    if (alt > CONFIG.LAYER_CONFIG.mid.min) return 'mid';
    if (alt > CONFIG.LAYER_CONFIG.low.min) return 'low';
    return 'below';
}

export function latLonAltToCartesian(lat, lon, alt) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = CONFIG.EARTH_RADIUS + (alt / 6371) * CONFIG.EARTH_RADIUS * 5.0;
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

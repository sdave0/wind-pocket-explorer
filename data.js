import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haversineDistance, latLonAltToCartesian } from './utils.js';

export let hourlyData = {};
export let trajectories = new Map();
export let velocities = new Map();

export async function loadData() {
    try {
        // Live data fetch (uncomment for local dev)
        /*
        const promises = [];
        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            promises.push(
                fetch(`https://corsproxy.io/?https://a.windbornesystems.com/treasure/${hourStr}.json`)
                    .then(res => res.json())
                    .then(data => ({ hour: hourStr, data }))
                    .catch(e => ({ hour: hourStr, data: [] }))
            );
        }
        const results = await Promise.allSettled(promises);
        hourlyData = {};
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                hourlyData[parseInt(result.value.hour)] = result.value.data;
            }
        });
        */

        const res = await fetch('full_data.json');
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        hourlyData = await res.json();

        processData();
        return true;
    } catch (error) {
        console.error("Error loading or processing balloon data:", error);
        return false;
    }
}

function processData() {
    let maxId = -1;
    for (const h in hourlyData) {
        maxId = Math.max(maxId, hourlyData[h].length - 1);
    }
    for (let i = 0; i <= maxId; i++) {
        trajectories.set(i, []);
    }
    for (const h in hourlyData) {
        hourlyData[h].forEach((pos, id) => {
            if (trajectories.has(id)) {
                trajectories.get(id).push({ pos, hour: parseInt(h) });
            }
        });
    }
    trajectories.forEach(traj => traj.sort((a, b) => a.hour - b.hour));

    for (let h = CONFIG.MIN_HOUR; h <= CONFIG.MAX_HOUR; h++) {
        const hourlyVelocities = new Map();
        for (const [id, traj] of trajectories.entries()) {
            const currentPoint = traj.find(p => p.hour === h);
            const prevPoint = traj.find(p => p.hour === h - 1);

            if (currentPoint && prevPoint) {
                const [lat1, lon1, alt1] = prevPoint.pos;
                const [lat2, lon2, alt2] = currentPoint.pos;

                const speed = haversineDistance(lat1, lon1, lat2, lon2);

                const pos1 = latLonAltToCartesian(lat1, lon1, alt1);
                const pos2 = latLonAltToCartesian(lat2, lon2, alt2);
                const direction = new THREE.Vector3().subVectors(pos2, pos1).normalize();

                hourlyVelocities.set(id, {
                    id: id,
                    speed,
                    direction,
                    position: pos2,
                    lat: lat2,
                    lon: lon2,
                    alt: alt2
                });
            }
        }
        velocities.set(h, hourlyVelocities);
    }
}

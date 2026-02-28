import * as THREE from 'three';
import { CONFIG } from './config.js';
import { velocities } from './data.js';

export const weatherCache = new Map();

export async function detectWindPockets(hour) {
    const pockets = [];
    const hourlyVels = velocities.get(hour);
    if (!hourlyVels) return pockets;

    const fastBalloons = [];
    for (const [id, velData] of hourlyVels.entries()) {
        if (velData.speed > CONFIG.MIN_SPEED_KMH) {
            fastBalloons.push({ id, ...velData });
        }
    }

    const grid = new Map();
    const latStep = 180 / CONFIG.GRID_DIVISIONS;
    const lonStep = 360 / CONFIG.GRID_DIVISIONS;

    for (const balloon of fastBalloons) {
        const gridX = Math.floor((balloon.lon + 180) / lonStep);
        const gridY = Math.floor((balloon.lat + 90) / latStep);
        const key = `${gridX},${gridY}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(balloon);
    }

    const pocketPromises = [];
    for (const [key, cluster] of grid.entries()) {
        if (cluster.length < CONFIG.MIN_BALLOONS_IN_POCKET) continue;

        const avgDirection = new THREE.Vector3();
        cluster.forEach(b => avgDirection.add(b.direction));
        avgDirection.normalize();

        let similarDirectionCount = 0;
        for (const balloon of cluster) {
            if (balloon.direction.dot(avgDirection) > CONFIG.DIRECTION_SIMILARITY_THRESHOLD) {
                similarDirectionCount++;
            }
        }

        if (similarDirectionCount >= CONFIG.MIN_BALLOONS_IN_POCKET) {
            const avgPosition = new THREE.Vector3();
            let avgSpeed = 0;
            let avgLat = 0;
            let avgLon = 0;
            cluster.forEach(b => {
                avgPosition.add(b.position);
                avgSpeed += b.speed;
                avgLat += b.lat;
                avgLon += b.lon;
            });
            avgPosition.divideScalar(cluster.length);
            avgSpeed /= cluster.length;
            avgLat /= cluster.length;
            avgLon /= cluster.length;

            let intensity = 'slow';
            let color = CONFIG.INTENSITY_LEVELS.slow.color;
            if (avgSpeed > CONFIG.INTENSITY_LEVELS.high.minSpeed) {
                intensity = 'High';
                color = CONFIG.INTENSITY_LEVELS.high.color;
            } else if (avgSpeed > CONFIG.INTENSITY_LEVELS.mid.minSpeed) {
                intensity = 'Mid';
                color = CONFIG.INTENSITY_LEVELS.mid.color;
            } else {
                intensity = 'Slow';
            }

            const pocket = {
                position: avgPosition,
                direction: avgDirection,
                speed: avgSpeed,
                count: cluster.length,
                intensity: intensity,
                color: color,
                lat: avgLat,
                lon: avgLon,
                windSpeedAtPocket: 'N/A'
            };
            pockets.push(pocket);
            pocketPromises.push(fetchPocketWeather(pocket, hour));
        }
    }
    await Promise.all(pocketPromises);
    return pockets;
}

async function fetchPocketWeather(pocket, hour) {
    const lat = pocket.lat.toFixed(2);
    const lon = pocket.lon.toFixed(2);
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=windspeed_${CONFIG.POCKET_WEATHER_ALTITUDE_PRESSURE}hPa&forecast_days=1`;

    const cacheKey = `${weatherUrl}-${hour}`;
    if (weatherCache.has(cacheKey)) {
        const cachedData = weatherCache.get(cacheKey);
        pocket.windSpeedAtPocket = cachedData.windSpeed;
        pocket.pressureAtPocket = cachedData.pressure;
        return;
    }

    try {
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error(`Weather API request failed with status ${res.status}`);
        const data = await res.json();

        if (data && data.hourly) {
            const windspeedKey = `windspeed_${CONFIG.POCKET_WEATHER_ALTITUDE_PRESSURE}hPa`;

            if (data.hourly[windspeedKey] && data.hourly[windspeedKey].length > hour) {
                const rawWindSpeedMs = data.hourly[windspeedKey][hour];
                pocket.windSpeedAtPocket = rawWindSpeedMs.toFixed(0);
            }
        }
        weatherCache.set(cacheKey, { windSpeed: pocket.windSpeedAtPocket, pressure: pocket.pressureAtPocket });
    } catch (err) {
        console.error(`Error fetching weather for pocket at ${lat},${lon}:`, err);
    }
}

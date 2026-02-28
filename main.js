import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { CONFIG } from './config.js';
import { getLayer } from './utils.js';
import { loadData, velocities } from './data.js';
import { detectWindPockets } from './detector.js';

let currentHour = CONFIG.MIN_HOUR;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

let controls;
const balloonContainer = new THREE.Group();
const pocketContainer = new THREE.Group();

const hourLabel = document.getElementById('hour-label');
const hourSlider = document.getElementById('hour-slider');
const avgSpeedEl = document.getElementById('avg-speed');
const highAltCountEl = document.getElementById('high-alt-count');
const midAltCountEl = document.getElementById('mid-alt-count');
const lowAltCountEl = document.getElementById('low-alt-count');
const pocketsPanelEl = document.getElementById('pockets-panel');
const pocketsListEl = document.getElementById('pockets-list');
const leaderboardListEl = document.getElementById('leaderboard-list');

function init() {
    renderer.setSize(window.innerWidth / 1.01, window.innerHeight / 1.01);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    camera.position.z = CONFIG.CAMERA_START_Z;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x888888));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const earthMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://raw.githack.com/mrdoob/three.js/dev/examples/textures/land_ocean_ice_cloud_2048.jpg'),
        shininess: 5
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.EARTH_RADIUS, 64, 64), earthMaterial);
    scene.add(earth);

    scene.add(balloonContainer);
    scene.add(pocketContainer);

    hourSlider.addEventListener('input', onHourChange);
    window.addEventListener('resize', onWindowResize);

    loadData().then(success => {
        if (success) {
            update();
        } else {
            hourLabel.textContent = "Error loading data.";
        }
    });
    animate();
}

async function update() {
    balloonContainer.clear();
    pocketContainer.clear();

    const hourlyVels = velocities.get(currentHour);
    if (!hourlyVels) return;

    let totalSpeed = 0;
    const layerCounts = { high: 0, mid: 0, low: 0, other: 0 };

    for (const velData of hourlyVels.values()) {
        totalSpeed += velData.speed;
        const layer = getLayer(velData.alt);
        if (layer in layerCounts) {
            layerCounts[layer]++;
        } else {
            layerCounts.other++;
        }
    }

    const avgSpeed = hourlyVels.size > 0 ? (totalSpeed / hourlyVels.size) : 0;
    avgSpeedEl.textContent = `${avgSpeed.toFixed(0)} km/h`;
    highAltCountEl.textContent = layerCounts.high;
    midAltCountEl.textContent = layerCounts.mid;
    lowAltCountEl.textContent = layerCounts.low;

    const sortedBalloons = Array.from(hourlyVels.values())
        .sort((a, b) => b.speed - a.speed)
        .slice(0, 10);

    let leaderboardHTML = '<li class="leaderboard-header"><span>Rank</span><span>ID</span><span>Speed</span><span>Layer</span></li>';
    sortedBalloons.forEach((balloon, index) => {
        const layer = getLayer(balloon.alt);
        leaderboardHTML += `<li><span>${index + 1}</span><span>${balloon.id}</span><span>${balloon.speed.toFixed(0)} km/h</span><span class="layer-text ${layer}">${layer}</span></li>`;
    });
    leaderboardListEl.innerHTML = leaderboardHTML;


    const balloonMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [id, velData] of hourlyVels.entries()) {
        const balloon = new THREE.Mesh(CONFIG.BALLOON_GEOMETRY, balloonMaterial);
        balloon.position.copy(velData.position);
        balloonContainer.add(balloon);
    }

    const pockets = await detectWindPockets(currentHour);

    pocketsPanelEl.classList.remove('hidden');

    if (pockets.length > 0) {
        let tableHTML = '<table><tr><th>Pocket #</th><th>Avg. Speed</th><th>Intensity</th><th>Wind Speed (m/s)</th></tr>';
        pockets.forEach((pocket, index) => {
            tableHTML += `<tr><td>${index + 1}</td><td>${pocket.speed.toFixed(0)} km/h</td><td style="color:${new THREE.Color(pocket.color).getStyle()}">${pocket.intensity}</td><td>${pocket.windSpeedAtPocket} m/s</td></tr>`;
        });
        tableHTML += '</table>';
        pocketsListEl.innerHTML = tableHTML;
    } else {
        pocketsListEl.innerHTML = '<p style="text-align: center; margin-top: 20px;">No wind pockets detected.</p>';
    }

    const pocketGeom = new THREE.CylinderGeometry(CONFIG.POCKET_MARKER_RADIUS, CONFIG.POCKET_MARKER_RADIUS, CONFIG.POCKET_MARKER_HEIGHT, 16);
    const arrowheadGeom = new THREE.ConeGeometry(CONFIG.POCKET_MARKER_RADIUS * 1.8, 0.5, 16);

    for (const pocket of pockets) {
        const arrow = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({
            color: pocket.color,
            transparent: true,
            opacity: 0.7
        });

        const body = new THREE.Mesh(pocketGeom, material);
        const arrowhead = new THREE.Mesh(arrowheadGeom, material);

        arrowhead.position.y = CONFIG.POCKET_MARKER_HEIGHT / 2;

        arrow.add(body);
        arrow.add(arrowhead);

        arrow.position.copy(pocket.position);
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pocket.direction);

        pocketContainer.add(arrow);
    }
}

function onHourChange(event) {
    currentHour = parseInt(event.target.value);
    hourLabel.textContent = currentHour;
    update();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

init();

import * as THREE from 'three';

// camera, scene, renderer
let scene;
let camera;
let renderer;
let group;
let sun, sun_geom, sun_mat;
let earth, earth_geom, earth_mat;
let textureCube;
let stars;
let controls;

// Переменные для управления камерой
let theta = 0;
let phi = 45;
let radious = 6300;
let onMouseDownTheta = 0;
let onMouseDownPhi = 45;
let onMouseDownPosition = { x: 0, y: 0 };

init();
animate();

document.addEventListener('mousedown', function(event) {
    if (event.button === 0) { // Левая кнопка мыши
        onMouseDownPosition.x = event.clientX;
        onMouseDownPosition.y = event.clientY;
        onMouseDownTheta = theta;
        onMouseDownPhi = phi;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }
});

function onMouseMove(event) {
    theta = onMouseDownTheta - ((event.clientX - onMouseDownPosition.x) * 0.5);
    phi = onMouseDownPhi + ((event.clientY - onMouseDownPosition.y) * 0.5);

    phi = Math.min(180, Math.max(0, phi));

    updateCameraPosition();
}

function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
}

function updateCameraPosition() {
    camera.position.x = radious * Math.sin(theta * Math.PI / 180) * Math.cos(phi * Math.PI / 180);
    camera.position.y = radious * Math.sin(phi * Math.PI / 180);
    camera.position.z = radious * Math.cos(theta * Math.PI / 180) * Math.cos(phi * Math.PI / 180);
    camera.lookAt(0, 0, 0);
    camera.updateMatrix();
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    group = new THREE.Object3D();
    stars = new THREE.Object3D();

    scene.background = new THREE.Color(0x111122);
    document.body.appendChild(renderer.domElement);

    updateCameraPosition();

    // Создание солнца
    sun_geom = new THREE.SphereGeometry(430, 64, 64);
    sun_mat = new THREE.MeshStandardMaterial({
        color: 0xffaa44,
        emissive: 0xff4422,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.3
    });
    sun = new THREE.Mesh(sun_geom, sun_mat);
    group.add(sun);

    // Создание земли
    earth_geom = new THREE.SphereGeometry(50, 64, 64);
    earth_mat = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        metalness: 0.1,
        roughness: 0.6
    });
    earth = new THREE.Mesh(earth_geom, earth_mat);
    earth.position.x = 1500;
    group.add(earth);

    // Добавление звезд
    const starGeometry = new THREE.SphereGeometry(3, 8, 8);
    const starMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    for (let i = 0; i < 1000; i++) {
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.x = (Math.random() - 0.5) * 8000;
        star.position.y = (Math.random() - 0.5) * 8000;
        star.position.z = (Math.random() - 0.5) * 8000;
        stars.add(star);
    }
    scene.add(stars);
    scene.add(group);

    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const fillLight = new THREE.DirectionalLight(0x888888, 0.5);
    fillLight.position.set(1, 1, 1);
    scene.add(fillLight);
}

function animate() {
    requestAnimationFrame(animate);

    // Анимация вращения группы
    group.rotation.y += 0.002;
    stars.rotation.y -= 0.0005;

    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
}

// Обработка изменения размера окна
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
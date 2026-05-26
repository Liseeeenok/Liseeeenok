import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// camera, scene, renderer
let scene;
let camera;
let renderer;
let group;
let sun, sun_geom, sun_mat;
let earth, earth_geom, earth_mat;
let stars;
let controls;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    group = new THREE.Object3D();
    stars = new THREE.Object3D();

    // Создание солнца
    sun_geom = new THREE.SphereGeometry(430, 128, 128);
    sun_mat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 1.2,
        metalness: 0.95,
        roughness: 0.2
    });
    sun = new THREE.Mesh(sun_geom, sun_mat);
    group.add(sun);

    // Добавляем внешнее свечение (корона Солнца) - эффект "лучей"
    const coronaGeometry = new THREE.SphereGeometry(460, 64, 64);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    group.add(corona);

    // Второй слой свечения
    const glowGeometry = new THREE.SphereGeometry(500, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Частицы вокруг Солнца (солнечная корона/протуберанцы)
    const particleCount = 800;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        // Случайное направление и расстояние от Солнца (450-550 единиц)
        const radius = 450 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffaa66,
        size: 3,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

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

    earth_geom = new THREE.SphereGeometry(50, 128, 128);
    earth_mat = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        metalness: 0.3,
        roughness: 0.5,
        emissive: 0x004466,
        emissiveIntensity: 0.1
    });
    earth = new THREE.Mesh(earth_geom, earth_mat);
    earth.position.x = 1500;
    group.add(earth);

    // Добавление звезд (улучшено - больше звезд и они ярче)
    const starCount = 3000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const sphereRadius = 8000; // Радиус сферы, на которой располагаются звезды

    for (let i = 0; i < starCount; i++) {
        // Распределение точек на сфере с большей плотностью к центру
        // Используем равномерное распределение по площади сферы для углов

        const u = Math.random();
        const v = Math.random();

        const theta = 2 * Math.PI * u;          // Азимутальный угол (0 - 2π)
        const phi = Math.acos(2 * v - 1);       // Полярный угол (0 - π)

        // СТЕПЕННОЕ РАСПРЕДЕЛЕНИЕ РАДИУСА
        // Чем больше степень, тем больше звезд будет в центре
        // Используем степень 2.5 (экспериментируйте со значением 1.5 - 4)
        const power = 2.5;
        const radiusFactor = Math.pow(Math.random(), power); // 0..1, но больше значений ближе к 0

        // Радиус от 1000 до sphereRadius (8000)
        const minRadius = 2000;  // Минимальный радиус (близко к центру)
        const radius = minRadius + (sphereRadius - minRadius) * radiusFactor;

        // Добавляем небольшой дополнительный разброс для естественности
        const radiusJitter = 0.9 + Math.random() * 0.2;
        const finalRadius = radius * radiusJitter;

        // Преобразование сферических координат в декартовы
        const x = finalRadius * Math.sin(phi) * Math.cos(theta);
        const y = finalRadius * Math.sin(phi) * Math.sin(theta);
        const z = finalRadius * Math.cos(phi);

        starPositions[i * 3] = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;

        // РАЗМЕР ЗВЕЗД ЗАВИСИТ ОТ РАССТОЯНИЯ
        // Ближние звезды - крупнее и ярче, дальние - мельче
        const distanceFactor = finalRadius / sphereRadius; // 0.125 - 1.0

        // Сохраняем размер для использования в материале (позже)
        // Для PointsMaterial нужно использовать отдельный атрибут или массив
        // Пока просто запоминаем в отдельном массиве (потребуется кастомный шейдер)

        // Разные цвета звезд (белые, голубоватые, желтоватые)
        // ДАЛЬНИЕ ЗВЕЗДЫ - БОЛЕЕ КРАСНЫЕ (красное смещение)
        const colorChoice = Math.random();
        const redshift = Math.min(1.0, distanceFactor * 1.5); // Дальние звезды краснеют

        if (colorChoice < 0.7) {
            // Белые звезды (с красным смещением для дальних)
            starColors[i * 3] = 1;
            starColors[i * 3 + 1] = (1 - redshift * 0.2);
            starColors[i * 3 + 2] = (1 - redshift * 0.3);
        } else if (colorChoice < 0.85) {
            // Голубоватые звезды (горячее)
            starColors[i * 3] = 0.7 * (1 - redshift * 0.1);
            starColors[i * 3 + 1] = 0.8 * (1 - redshift * 0.15);
            starColors[i * 3 + 2] = (1 - redshift * 0.2);
        } else {
            // Желтоватые/оранжевые звезды (холоднее)
            starColors[i * 3] = 1;
            starColors[i * 3 + 1] = 0.7 * (1 - redshift * 0.2);
            starColors[i * 3 + 2] = 0.5 * (1 - redshift * 0.3);
        }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterialPoints = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9
    });

    const starField = new THREE.Points(starGeometry, starMaterialPoints);
    scene.add(starField);

    scene.add(group);

    // Яркий ambient свет (Солнце освещает всё)
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    // Основной точечный свет от Солнца (очень яркий)
    const sunLight = new THREE.PointLight(0xffaa66, 2.5, 5000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Свет от Земли (слабое отражение)
    const earthLight = new THREE.PointLight(0x4488ff, 0.3, 800);
    earthLight.position.set(1500, 0, 0);
    group.add(earthLight);

    // === ORBIT CONTROLS ===
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;          // Плавное затухание движения
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    controls.enablePan = false;             // Отключаем панорамирование, чтобы не улететь
    controls.target.set(0, 0, 0);

    // Устанавливаем начальную позицию камеры
    camera.position.set(4000, 1600, 4000);
    controls.update();
}

function animate() {
    requestAnimationFrame(animate);

    // Анимация вращения группы
    group.rotation.y += 0.0015;

    group.children.forEach(child => {
        if (child.isPoints) {
            child.rotation.y += 0.002;
            child.rotation.x += 0.001;
        }
    });

    group.children.forEach(child => {
        if (child instanceof THREE.PointLight && child.intensity < 0.5) {
            child.position.set(earth.position.x, earth.position.y, earth.position.z);
        }
    });

    // Обновляем controls
    controls.update();

    // Рендеринг
    renderer.render(scene, camera);
}

// Обработка изменения размера окна
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
animate();
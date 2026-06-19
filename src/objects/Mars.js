import * as THREE from 'three';
import { Planet } from '../abstract/Planet.js';

export class Mars extends Planet {
    static defaultDistance = 2100;
    static defaultOrbitSpeed = 0.0012;
    static order = 4;

    constructor() {
        const config = {
            name: 'Mars',
            description: 'The Red Planet. Fourth from the Sun, featuring the tallest mountain in the solar system - Olympus Mons.',
            radius: 42,
            distance: Mars.defaultDistance,
            color: 0xcc6644,
            emissive: 0x441100,
            emissiveIntensity: 0.05,
            metalness: 0.4,
            roughness: 0.7,
            orbitSpeed: Mars.defaultOrbitSpeed,
            rotationSpeed: 0.004,
            hasAtmosphere: true,
            atmosphereColor: 0xcc8866,
            atmosphereOpacity: 0.08,
            glowColor: 0xff6633,
            glowIntensity: 0.3,
            glowRadius: 1.8
        };

        super(config);

        // Специфичные для Марса параметры
        this.dustColor = 0xaa5533;
        this.hasDustStorms = true;
    }

    createCustomMaterial() {
        // Создаем более детализированную поверхность Марса
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Базовый цвет
        ctx.fillStyle = '#cc6644';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Добавляем кратеры и детали
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 2 + Math.random() * 8;
            const darkness = 0.4 + Math.random() * 0.4;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(80, 40, 20, ${darkness * 0.6})`;
            ctx.fill();

            // Светлые края кратеров
            ctx.beginPath();
            ctx.arc(x - 1, y - 1, radius * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 120, 80, ${darkness * 0.4})`;
            ctx.fill();
        }

        // Добавляем темные области (mare)
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.ellipse(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                20 + Math.random() * 50,
                15 + Math.random() * 40,
                Math.random() * Math.PI * 2,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(80, 40, 20, ${0.3 + Math.random() * 0.3})`;
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);

        return new THREE.MeshStandardMaterial({
            map: texture,
            color: this.color,
            metalness: this.metalness,
            roughness: this.roughness,
            emissive: this.emissive,
            emissiveIntensity: this.emissiveIntensity
        });
    }

    // Специфический метод для Марса - пылевые бури
    createDustStorm() {
        const particleCount = 2000;
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Частицы вокруг Марса
            const radius = this.radius + 10 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // Сплюснуто по Y
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: this.dustColor,
            size: 0.8,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        this.dustParticles = new THREE.Points(particlesGeometry, particleMaterial);
        this.planetGroup.add(this.dustParticles);

        return this.dustParticles;
    }

    update(deltaTime = 1) {
        super.update(deltaTime);

        // Анимация пылевых частиц
        if (this.dustParticles) {
            this.dustParticles.rotation.y += 0.01 * deltaTime;
            this.dustParticles.rotation.x += 0.005 * deltaTime;
        }
    }
}
import * as THREE from 'three';
import { Planet } from '../abstract/Planet.js';

export class Earth extends Planet {
    static defaultDistance = 1500;
    static defaultOrbitSpeed = 0.0015;
    static order = 3;

    constructor() {
        const config = {
            name: 'Earth',
            description: 'Our home planet. The third planet from the Sun, known for its liquid water and diverse life forms.',
            radius: 50,
            distance: Earth.defaultDistance,
            color: 0x44aaff,
            emissive: 0x004466,
            emissiveIntensity: 0.1,
            metalness: 0.3,
            roughness: 0.5,
            orbitSpeed: Earth.defaultOrbitSpeed,
            rotationSpeed: 0.005,
            hasAtmosphere: true,
            atmosphereColor: 0x88aaff,
            atmosphereOpacity: 0.15,
            slowDownFactor: 0.15
        };

        super(config);

        // Специфичные для Земли параметры
        this.waterColor = 0x3388ff;
        this.landColor = 0x44aa66;
    }

    createCustomMaterial() {
        // Для реальной текстуры Земли можно загрузить изображение
        // Пока используем улучшенный стандартный материал
        const textureLoader = new THREE.TextureLoader();

        // Опционально: загрузка текстур
        // const earthMap = textureLoader.load('/textures/earth_map.jpg');
        // const earthSpecularMap = textureLoader.load('/textures/earth_specular.jpg');

        return new THREE.MeshStandardMaterial({
            color: this.color,
            metalness: this.metalness,
            roughness: this.roughness,
            emissive: this.emissive,
            emissiveIntensity: this.emissiveIntensity
        });
    }

    // Специфический метод для Земли
    addClouds() {
        const cloudGeometry = new THREE.SphereGeometry(this.radius * 1.01, 128, 128);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.planetGroup.add(clouds);

        // Анимация облаков
        this.clouds = clouds;
        return clouds;
    }

    update(deltaTime = 1) {
        super.update(deltaTime);

        // Вращение облаков немного быстрее
        if (this.clouds) {
            this.clouds.rotation.y += this.rotationSpeed * 1.2 * deltaTime;
        }
    }
}
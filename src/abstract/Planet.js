import * as THREE from 'three';

export class Planet {
    static defaultDistance = 1000;
    static defaultOrbitSpeed = 0.0015;
    static order = 0; // Порядок от Солнца

    constructor(config) {
        // Конфигурация планеты
        this.name = config.name || 'Planet';
        this.radius = config.radius || 50;
        this.distance = config.distance || this.constructor.defaultDistance;
        this.color = config.color || 0x44aaff;
        this.emissive = config.emissive || 0x000000;
        this.emissiveIntensity = config.emissiveIntensity || 0;
        this.metalness = config.metalness || 0.3;
        this.roughness = config.roughness || 0.5;

        // Орбитальные параметры
        this.orbitSpeed = config.orbitSpeed || this.constructor.defaultOrbitSpeed;
        this.rotationSpeed = config.rotationSpeed || 0.005;

        // Атмосфера
        this.hasAtmosphere = config.hasAtmosphere || false;
        this.atmosphereColor = config.atmosphereColor || 0x88aaff;
        this.atmosphereOpacity = config.atmosphereOpacity || 0.2;

        // 3D объекты
        this.mesh = null;
        this.atmosphere = null;
        this.orbitGroup = new THREE.Object3D(); // Группа для орбиты
        this.planetGroup = new THREE.Object3D(); // Группа для самой планеты (для вращения)

        // Начальный угол на орбите (в радианах)
        this.orbitAngle = config.orbitAngle || Math.random() * Math.PI * 2;
    }

    // Абстрактные методы (должны быть переопределены)
    createCustomMaterial() {
        // Базовый материал, может быть переопределен в наследниках
        return new THREE.MeshStandardMaterial({
            color: this.color,
            metalness: this.metalness,
            roughness: this.roughness,
            emissive: this.emissive,
            emissiveIntensity: this.emissiveIntensity
        });
    }

    createTexture() {
        // Для создания текстур поверхности (переопределить в наследниках)
        return null;
    }

    create() {
        // Создание материала
        let material = this.createCustomMaterial();

        // Создание геометрии
        const geometry = new THREE.SphereGeometry(this.radius, 128, 128);
        this.mesh = new THREE.Mesh(geometry, material);

        // Добавление атмосферы, если есть
        if (this.hasAtmosphere) {
            this.addAtmosphere();
        }

        // Настройка групп
        this.planetGroup.add(this.mesh);
        if (this.atmosphere) {
            this.planetGroup.add(this.atmosphere);
        }

        this.orbitGroup.add(this.planetGroup);

        // Установка начальной позиции на орбите
        this.updateOrbitPosition();

        return this.orbitGroup;
    }

    addAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(this.radius * 1.02, 128, 128);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: this.atmosphereColor,
            transparent: true,
            opacity: this.atmosphereOpacity,
            side: THREE.BackSide
        });
        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    }

    updateOrbitPosition() {
        // Вычисление позиции на орбите
        const x = Math.cos(this.orbitAngle) * this.distance;
        const z = Math.sin(this.orbitAngle) * this.distance;
        this.orbitGroup.position.set(x, 0, z);
    }

    update(deltaTime = 1) {
        // Обновление угла орбиты
        this.orbitAngle += this.orbitSpeed * deltaTime;
        if (this.orbitAngle > Math.PI * 2) {
            this.orbitAngle -= Math.PI * 2;
        }

        // Обновление позиции
        this.updateOrbitPosition();

        // Вращение планеты вокруг своей оси
        this.planetGroup.rotation.y += this.rotationSpeed * deltaTime;
    }

    getPosition() {
        return this.orbitGroup ? this.orbitGroup.position : null;
    }

    getMesh() {
        return this.mesh;
    }

    getOrbitGroup() {
        return this.orbitGroup;
    }

    getPlanetGroup() {
        return this.planetGroup;
    }

    setOrbitSpeed(speed) {
        this.orbitSpeed = speed;
    }

    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }
}
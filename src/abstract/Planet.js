import * as THREE from 'three';

export class Planet {
    static defaultDistance = 1000;
    static defaultOrbitSpeed = 0.0015;
    static order = 0; // Порядок от Солнца

    constructor(config) {
        // Конфигурация планеты
        this.name = config.name || 'Planet';
        this.description = config.description || 'A mysterious planet';
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

        // Параметры замедления при наведении
        this.slowDownFactor = config.slowDownFactor || 0.1; // На сколько замедлять (0.1 = 10% от скорости)
        this.isSlowed = false;
        this.instantStop = false;
        this.currentOrbitSpeed = this.orbitSpeed;
        this.currentRotationSpeed = this.rotationSpeed;
        this.smoothTransitionSpeed = config.smoothTransitionSpeed || 0.05; // Скорость плавного перехода

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

        // Для взаимодействия
        this.isHovered = false;
        this.originalEmissiveIntensity = this.emissiveIntensity;
        this.hoverEmissiveIntensity = 0.5;
        this.hoverColor = 0xffffff;

        // Для эффектов
        this.glowMesh = null;
        this.label = null;
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

        this.material = material;

        this.createGlowEffect();

        // Добавление атмосферы, если есть
        if (this.hasAtmosphere) {
            this.addAtmosphere();
        }

        // Настройка групп
        this.planetGroup.add(this.mesh);
        
        if (this.glowMesh) {
            this.planetGroup.add(this.glowMesh);
        }
        if (this.atmosphere) {
            this.planetGroup.add(this.atmosphere);
        }

        this.orbitGroup.add(this.planetGroup);

        // Установка начальной позиции на орбите
        this.updateOrbitPosition();

        return this.orbitGroup;
    }

    createGlowEffect() {
        const glowGeometry = new THREE.SphereGeometry(this.radius * 1.5, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.hoverColor,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
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
        this.orbitAngle += this.currentOrbitSpeed * deltaTime;
        if (this.orbitAngle > Math.PI * 2) {
            this.orbitAngle -= Math.PI * 2;
        }

        // Обновление позиции
        this.updateOrbitPosition();

        // Вращение планеты вокруг своей оси
        this.planetGroup.rotation.y += this.currentRotationSpeed * deltaTime;

        // Плавное обновление скоростей
        this.updateSpeedTransition();
    }

    updateSpeedTransition() {
        // Плавный переход скорости орбиты
        const targetOrbitSpeed = this.isSlowed ? this.orbitSpeed * this.slowDownFactor : this.orbitSpeed;
        
        if (this.instantStop) {
            // Мгновенная остановка
            this.currentOrbitSpeed = 0;
            this.currentRotationSpeed = 0;
        } else {
            this.currentOrbitSpeed += (targetOrbitSpeed - this.currentOrbitSpeed) * this.smoothTransitionSpeed;
            
            // Плавный переход скорости вращения
            const targetRotationSpeed = this.isSlowed ? this.rotationSpeed * this.slowDownFactor : this.rotationSpeed;
            this.currentRotationSpeed += (targetRotationSpeed - this.currentRotationSpeed) * this.smoothTransitionSpeed;
        }
    }

    // Методы для взаимодействия
    onHoverStart() {
        this.isHovered = true;
        this.isSlowed = true;
        if (this.material) {
            this.material.emissive.setHex(this.hoverColor);
            this.material.emissiveIntensity = this.hoverEmissiveIntensity;
        }
        if (this.glowMesh) {
            this.glowMesh.material.opacity = 0.3;
        }
    }

    onHoverEnd() {
        this.isHovered = false;
        this.isSlowed = false;
        if (this.material) {
            this.material.emissive.setHex(this.emissive);
            this.material.emissiveIntensity = this.originalEmissiveIntensity;
        }
        if (this.glowMesh) {
            this.glowMesh.material.opacity = 0;
        }
    }

    getPosition() {
        const worldPos = new THREE.Vector3();
        if (this.orbitGroup) {
            this.orbitGroup.getWorldPosition(worldPos);
        }
        return worldPos;
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
        if (!this.isSlowed) {
            this.currentOrbitSpeed = speed;
        }
    }

    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
        if (!this.isSlowed) {
            this.currentRotationSpeed = speed;
        }
    }

    getDescription() {
        return this.description;
    }
}
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

        // Параметры свечения
        this.glowColor = config.glowColor || this.color;
        this.glowIntensity = config.glowIntensity || 0.3;
        this.glowRadius = config.glowRadius || 1.8;

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
        const outerGlowGeometry = new THREE.SphereGeometry(this.radius * 2.0, 64, 64);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: this.glowColor,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.outerGlowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        this.planetGroup.add(this.outerGlowMesh);

        // Создаем частицы свечения
        this.createGlowParticles();
    }

    createGlowParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const radius = this.radius * (1.2 + Math.random() * 1.5);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            sizes[i] = 1 + Math.random() * 3;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: this.glowColor,
            size: 2,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.glowParticles = new THREE.Points(geometry, material);
        this.planetGroup.add(this.glowParticles);
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

    updateGlowAnimation(deltaTime) {
        if (this.glowMesh) {
            // Пульсация свечения
            const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.001 * 0.5);
            this.glowMesh.scale.set(pulse, pulse, pulse);

            // Плавное изменение прозрачности
            if (!this.isHovered) {
                this.glowMesh.material.opacity = 0.1 + 0.05 * Math.sin(Date.now() * 0.001 * 0.3);
            }
        }

        if (this.outerGlowMesh) {
            // Внешнее свечение пульсирует с другой скоростью
            const pulse = 1 + 0.08 * Math.sin(Date.now() * 0.001 * 0.4 + 1);
            this.outerGlowMesh.scale.set(pulse, pulse, pulse);
        }

        if (this.glowParticles) {
            this.glowParticles.rotation.y += 0.002 * deltaTime;
            this.glowParticles.rotation.x += 0.001 * deltaTime;

            // Пульсация частиц
            this.glowParticles.material.opacity = 0.2 + 0.15 * Math.sin(Date.now() * 0.001 * 0.6);
        }
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

    setGlowColor(color) {
        this.glowColor = color;
        if (this.glowMesh) {
            this.glowMesh.material.color.setHex(color);
        }
        if (this.outerGlowMesh) {
            this.outerGlowMesh.material.color.setHex(color);
        }
        if (this.glowParticles) {
            this.glowParticles.material.color.setHex(color);
        }
    }

    // Метод для настройки интенсивности свечения
    setGlowIntensity(intensity) {
        this.glowIntensity = intensity;
        if (this.glowMesh) {
            this.glowMesh.material.opacity = intensity * 0.5;
        }
        if (this.outerGlowMesh) {
            this.outerGlowMesh.material.opacity = intensity * 0.25;
        }
        if (this.glowParticles) {
            this.glowParticles.material.opacity = intensity * 0.8;
        }
    }
}
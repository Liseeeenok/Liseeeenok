import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { CameraManager } from './core/CameraManager.js';
import { RendererManager } from './core/RendererManager.js';
import { Sun } from './objects/Sun.js';
import { ProjectPlanet } from './objects/ProjectPlanet.js';
import { StarField } from './objects/StarField.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { LightingSystem } from './lights/LightingSystem.js';
import { AnimationController } from './animations/AnimationController.js';
import { InteractionManager } from './interaction/InteractionManager.js';
import { projectPlanets } from './data/projectPlanets.js';

class SolarSystemApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.cameraManager = new CameraManager();
        this.rendererManager = new RendererManager();
        this.sun = new Sun();
        this.starField = new StarField();
        this.particleSystem = new ParticleSystem();
        this.lightingSystem = new LightingSystem();
        this.animationController = null;
        this.interactionManager = null;

        this.mainGroup = new THREE.Object3D();
        this.planets = [];

        this.planetConfigs = projectPlanets;
    }

    async init() {
        // Инициализация базовых компонентов
        const scene = this.sceneManager.init();
        const camera = this.cameraManager.init();
        const renderer = this.rendererManager.init();

        // Создание объектов
        const sunGroup = this.sun.create();
        const starFieldMesh = this.starField.create();
        const sunParticles = this.particleSystem.createAroundSun();

        // Добавление объектов в группу
        this.mainGroup.add(sunGroup);
        this.mainGroup.add(sunParticles);

        await this.createAllPlanets();

        scene.add(this.mainGroup);
        scene.add(starFieldMesh);

        // Создание освещения
        this.lightingSystem.createLights(scene);

        // Инициализация анимации
        this.animationController = new AnimationController(camera, renderer, scene);
        this.animationController.initControls();

        // Инициализация InteractionManager
        this.interactionManager = new InteractionManager(scene, camera, renderer);

        this.interactionManager.registerInteractiveObject(this.sun);
        
        // Регистрируем планеты для взаимодействия
        this.planets.forEach(planet => {
            this.interactionManager.registerInteractiveObject(planet);
        });

        // Запуск анимации с кастомным update
        this.animationController.startAnimation(() => {
            this.update();

            const controls = this.animationController.getControls();
            if (this.interactionManager) {
                this.interactionManager.update(controls);
            }
        });

        // Обработка resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    async createAllPlanets() {
        // Автоматическое создание всех зарегистрированных планет
        const planetPromises = this.planetConfigs.map(async (planetConfig) => {
            const motionConfig = this.getPlanetMotionConfig(planetConfig);
            const visualConfig = this.getPlanetVisualConfig(planetConfig);
            const planet = new ProjectPlanet({
                description: `${planetConfig.name} project`,
                orbitSpeed: motionConfig.orbitSpeed,
                rotationSpeed: motionConfig.rotationSpeed,
                hasAtmosphere: false,
                atmosphereOpacity: 0,
                slowDownFactor: 0.15,
                glowIntensity: visualConfig.glowIntensity,
                glowRadius: planetConfig.surfaceType === 'gas' ? 1.125 : 1.02,
                ...planetConfig
            });

            // Создание планеты
            const planetGroup = planet.create();
            this.mainGroup.add(planetGroup);

            this.planets.push(planet);

            console.log(`✅ Planet created: ${planet.name} (Distance: ${planet.distance}, Radius: ${planet.radius})`);
            return planet;
        });

        await Promise.all(planetPromises);

        // Сортировка планет по расстоянию от Солнца (для порядка)
        this.planets.sort((a, b) => a.distance - b.distance);
    }

    getPlanetMotionConfig(planetConfig) {
        if (planetConfig.surfaceType === 'gas') {
            return {
                orbitSpeed: 0.00055,
                rotationSpeed: 0.00125
            };
        }

        if (planetConfig.surfaceType === 'ice') {
            return {
                orbitSpeed: 0.00095,
                rotationSpeed: 0.0031
            };
        }

        if (planetConfig.surfaceType === 'dark') {
            return {
                orbitSpeed: 0.0011,
                rotationSpeed: 0.0036
            };
        }

        return {
            orbitSpeed: 0.00078,
            rotationSpeed: 0.0022
        };
    }

    getPlanetVisualConfig(planetConfig) {
        if (planetConfig.surfaceType === 'gas') {
            return {
                glowIntensity: 0.72
            };
        }

        if (planetConfig.surfaceType === 'rocky') {
            return {
                glowIntensity: 0.42
            };
        }

        if (planetConfig.surfaceType === 'ice') {
            return {
                glowIntensity: 0.32
            };
        }

        return {
            glowIntensity: 0.22
        };
    }

    update() {
        this.mainGroup.children.forEach(child => {
            if (child.isPoints) {
                child.rotation.y += 0.002;
                child.rotation.x += 0.001;
            }
        });

        this.planets.forEach(planet => {
            planet.update();
        });
    }

    onWindowResize() {
        this.cameraManager.onWindowResize();
        this.rendererManager.onWindowResize();
        if (this.interactionManager) {
            this.interactionManager.onResize();
        }
    }
}

// Запуск приложения
const app = new SolarSystemApp();
app.init();
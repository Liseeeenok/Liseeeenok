import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { CameraManager } from './core/CameraManager.js';
import { RendererManager } from './core/RendererManager.js';
import { Sun } from './objects/Sun.js';
import { StarField } from './objects/StarField.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { LightingSystem } from './lights/LightingSystem.js';
import { AnimationController } from './animations/AnimationController.js';
import { InteractionManager } from './interaction/InteractionManager.js';

import { Earth } from './objects/Earth.js';
import { Mars } from './objects/Mars.js';

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

        this.planetClasses = [
            Earth,
            Mars,
            // Venus,    // Раскомментировать когда добавим
            // Jupiter,  // Раскомментировать когда добавим
            // Saturn    // Раскомментировать когда добавим
        ];
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
        
        // Регистрируем планеты для взаимодействия
        this.planets.forEach(planet => {
            this.interactionManager.registerPlanet(planet);
        });

        // Запуск анимации с кастомным update
        this.animationController.startAnimation(() => {
            this.update();

            const controls = this.animationController.getControls();
            if (this.interactionManager) {
                this.interactionManager.currentControls = controls;
                this.interactionManager.update(controls);
            }
        });

        // Обработка resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    async createAllPlanets() {
        // Автоматическое создание всех зарегистрированных планет
        const planetPromises = this.planetClasses.map(async (PlanetClass, index) => {
            const planet = new PlanetClass();

            // Автоматическая настройка орбитальных параметров
            // Можно добавить расстояние или другие параметры через статические методы
            if (PlanetClass.defaultDistance) {
                planet.distance = PlanetClass.defaultDistance;
            }

            // Создание планеты
            const planetGroup = planet.create();
            this.mainGroup.add(planetGroup);

            // Добавление специфических эффектов
            if (planet.addClouds && typeof planet.addClouds === 'function') {
                planet.addClouds();
            }

            if (planet.createDustStorm && typeof planet.createDustStorm === 'function') {
                planet.createDustStorm();
            }

            this.planets.push(planet);

            console.log(`✅ Planet created: ${planet.name} (Distance: ${planet.distance}, Radius: ${planet.radius})`);
            return planet;
        });

        await Promise.all(planetPromises);

        // Сортировка планет по расстоянию от Солнца (для порядка)
        this.planets.sort((a, b) => a.distance - b.distance);
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
import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { CameraManager } from './core/CameraManager.js';
import { RendererManager } from './core/RendererManager.js';
import { Sun } from './objects/Sun.js';
import { Earth } from './objects/Earth.js';
import { StarField } from './objects/StarField.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { LightingSystem } from './lights/LightingSystem.js';
import { AnimationController } from './animations/AnimationController.js';

class SolarSystemApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.cameraManager = new CameraManager();
        this.rendererManager = new RendererManager();
        this.sun = new Sun();
        this.earth = new Earth();
        this.starField = new StarField();
        this.particleSystem = new ParticleSystem();
        this.lightingSystem = new LightingSystem();
        this.animationController = null;

        this.mainGroup = new THREE.Object3D();
    }

    init() {
        // Инициализация базовых компонентов
        const scene = this.sceneManager.init();
        const camera = this.cameraManager.init();
        const renderer = this.rendererManager.init();

        // Создание объектов
        const sunGroup = this.sun.create();
        const earthMesh = this.earth.create();
        const starFieldMesh = this.starField.create();
        const sunParticles = this.particleSystem.createAroundSun();

        // Добавление объектов в группу
        this.mainGroup.add(sunGroup);
        this.mainGroup.add(earthMesh);
        this.mainGroup.add(sunParticles);

        scene.add(this.mainGroup);
        scene.add(starFieldMesh);

        // Создание освещения
        this.lightingSystem.createLights(scene);
        const earthLight = this.lightingSystem.createEarthLight(scene, this.earth.getPosition());

        // Инициализация анимации
        this.animationController = new AnimationController(camera, renderer, scene);
        this.animationController.initControls();

        // Запуск анимации с кастомным update
        this.animationController.startAnimation(() => {
            this.update(earthLight);
        });

        // Обработка resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    update(earthLight) {
        // Вращение всей группы
        this.mainGroup.rotation.y += 0.0015;

        // Вращение частиц
        this.mainGroup.children.forEach(child => {
            if (child.isPoints) {
                child.rotation.y += 0.002;
                child.rotation.x += 0.001;
            }
        });

        // Обновление позиции света Земли
        const earthPos = this.earth.getPosition();
        if (earthPos && earthLight) {
            this.lightingSystem.updateEarthLightPosition(earthPos);
        }
    }

    onWindowResize() {
        this.cameraManager.onWindowResize();
        this.rendererManager.onWindowResize();
    }
}

// Запуск приложения
const app = new SolarSystemApp();
app.init();
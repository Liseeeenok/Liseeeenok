import * as THREE from 'three';

export class LightingSystem {
    constructor() {
        this.ambientLight = null;
        this.hemisphereLight = null;
        this.directionalLight = null;
    }

    createLights(scene) {
        // 1. Базовое освещение (очень слабое, чтобы не было полной темноты)
        this.ambientLight = new THREE.AmbientLight(0x222244, 0.3);
        scene.add(this.ambientLight);

        // 2. Полусферический свет для мягкого заполнения
        this.hemisphereLight = new THREE.HemisphereLight(0x4444ff, 0x442222, 1);
        scene.add(this.hemisphereLight);

        // 3. Основной направленный свет от Солнца (имитация солнечного света)
        this.directionalLight = new THREE.DirectionalLight(0xffaa66, 1.5);
        this.directionalLight.position.set(0, 0, 0);
        scene.add(this.directionalLight);

        return this.directionalLight;
    }
}
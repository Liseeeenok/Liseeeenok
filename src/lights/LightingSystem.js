import * as THREE from 'three';

export class LightingSystem {
    constructor() {
        this.ambientLight = null;
        this.hemisphereLight = null;
        this.sunLight = null;
    }

    createLights(scene) {
        // Общая фоновая подсветка, чтобы теневая сторона планет оставалась читаемой
        this.ambientLight = new THREE.AmbientLight(0x6a7388, 0.55);
        scene.add(this.ambientLight);

        // Мягкая полусферическая заливка: небо чуть холоднее, низ теплее
        this.hemisphereLight = new THREE.HemisphereLight(0x9aa8c4, 0x3a2f28, 0.35);
        scene.add(this.hemisphereLight);

        // Основной свет от Солнца
        this.sunLight = new THREE.PointLight(0xffaa66, 17.2, 0, 0.4);
        this.sunLight.position.set(0, 0, 0);
        scene.add(this.sunLight);

        return this.sunLight;
    }
}

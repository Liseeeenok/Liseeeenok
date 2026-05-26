import * as THREE from 'three';

export class LightingSystem {
    constructor() {
        this.ambientLight = null;
        this.sunLight = null;
        this.earthLight = null;
    }

    createLights(scene) {
        this.ambientLight = new THREE.AmbientLight(0x222222);
        scene.add(this.ambientLight);

        this.sunLight = new THREE.PointLight(0xffaa66, 2.5, 5000);
        this.sunLight.position.set(0, 0, 0);
        scene.add(this.sunLight);

        return {
            sunLight: this.sunLight,
            ambientLight: this.ambientLight
        };
    }

    createEarthLight(scene, earthPosition) {
        this.earthLight = new THREE.PointLight(0x4488ff, 0.3, 800);
        if (earthPosition) {
            this.earthLight.position.set(earthPosition.x, earthPosition.y, earthPosition.z);
        }
        scene.add(this.earthLight);
        return this.earthLight;
    }

    updateEarthLightPosition(position) {
        if (this.earthLight && position) {
            this.earthLight.position.set(position.x, position.y, position.z);
        }
    }
}
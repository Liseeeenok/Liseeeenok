import * as THREE from 'three';

export class CameraManager {
    constructor() {
        this.camera = null;
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
        this.camera.position.set(4000, 1600, 4000);
        return this.camera;
    }

    getCamera() {
        return this.camera;
    }

    onWindowResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
}
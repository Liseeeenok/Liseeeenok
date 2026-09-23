import * as THREE from 'three';

export class CameraManager {
    constructor() {
        this.camera = null;
        this.defaultPosition = new THREE.Vector3(4000, 1600, 2000);
        this.defaultTarget = new THREE.Vector3(0, 0, 0);
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);

        if (window.innerWidth < 768) {
            this.defaultPosition.set(4800, 1900, 2600);
        }

        this.camera.position.copy(this.defaultPosition);
        return this.camera;
    }

    getCamera() {
        return this.camera;
    }

    getDefaultPosition() {
        return this.defaultPosition.clone();
    }

    getDefaultTarget() {
        return this.defaultTarget.clone();
    }

    onWindowResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            if (window.innerWidth < 768) {
                this.defaultPosition.set(4800, 1900, 2600);
            } else {
                this.defaultPosition.set(4000, 1600, 2000);
            }
        }
    }
}
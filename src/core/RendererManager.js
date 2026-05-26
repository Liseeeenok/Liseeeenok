import * as THREE from 'three';

export class RendererManager {
    constructor() {
        this.renderer = null;
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        return this.renderer;
    }

    getRenderer() {
        return this.renderer;
    }

    render(scene, camera) {
        if (this.renderer) {
            this.renderer.render(scene, camera);
        }
    }

    onWindowResize() {
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
import * as THREE from 'three';

function getMaxPixelRatio() {
    return window.innerWidth < 768 ? 1 : 1.5;
}

export class RendererManager {
    constructor() {
        this.renderer = null;
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, getMaxPixelRatio()));
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
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, getMaxPixelRatio()));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
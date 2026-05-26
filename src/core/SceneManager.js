import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = null;
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111122);
        return this.scene;
    }

    getScene() {
        return this.scene;
    }
}
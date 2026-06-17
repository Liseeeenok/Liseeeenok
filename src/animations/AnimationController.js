import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export class AnimationController {
    constructor(camera, renderer, scene) {
        this.controls = null;
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.animationFrameId = null;
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 0.1;
        this.controls.enablePan = false;
        this.controls.target.set(0, 0, 0);

        // Сохраняем ссылку на target для InteractionManager
        this.controls.target = new THREE.Vector3(0, 0, 0);

        return this.controls;
    }

    startAnimation(updateCallback) {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);

            if (updateCallback) {
                updateCallback();
            }

            if (this.controls) {
                this.controls.update();
            }

            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    getControls() {
        return this.controls;
    }
}
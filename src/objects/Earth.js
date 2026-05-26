import * as THREE from 'three';

export class Earth {
    constructor() {
        this.mesh = null;
    }

    create() {
        const earth_geom = new THREE.SphereGeometry(50, 128, 128);
        const earth_mat = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            metalness: 0.3,
            roughness: 0.5,
            emissive: 0x004466,
            emissiveIntensity: 0.1
        });
        this.mesh = new THREE.Mesh(earth_geom, earth_mat);
        this.mesh.position.x = 1500;
        return this.mesh;
    }

    getMesh() {
        return this.mesh;
    }

    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }
}
import * as THREE from 'three';

export class Sun {
    constructor() {
        this.group = new THREE.Object3D();
        this.sun = null;
        this.corona = null;
        this.glow = null;
    }

    create() {
        // Солнце
        const sun_geom = new THREE.SphereGeometry(430, 128, 128);
        const sun_mat = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: 1.2,
            metalness: 0.95,
            roughness: 0.2
        });
        this.sun = new THREE.Mesh(sun_geom, sun_mat);
        this.group.add(this.sun);

        // Внешнее свечение (корона)
        const coronaGeometry = new THREE.SphereGeometry(460, 64, 64);
        const coronaMaterial = new THREE.MeshBasicMaterial({
            color: 0xff8844,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.group.add(this.corona);

        // Второй слой свечения
        const glowGeometry = new THREE.SphereGeometry(500, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa66,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.glow);

        return this.group;
    }

    getGroup() {
        return this.group;
    }

    getSunMesh() {
        return this.sun;
    }
}
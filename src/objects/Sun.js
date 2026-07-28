import * as THREE from 'three';

export class Sun {
    constructor() {
        this.group = new THREE.Object3D();
        this.sun = null;
        this.corona = null;
        this.glow = null;
        this.name = 'AboutMe';
        this.description = 'This is the main portfolio hub. Add a short introduction for hover and a longer about section for click.';
        this.contentKey = 'about-me';
        this.radius = 430;
        this.originalEmissiveIntensity = 1.45;
        this.hoverEmissiveIntensity = 2.1;
        this.isHovered = false;
        this.isSlowed = false;
        this.instantStop = false;
    }

    create() {
        // Солнце
        const sun_geom = new THREE.SphereGeometry(430, 128, 128);
        const sunTexture = new THREE.TextureLoader().load('/textures/2k_sun.jpg');
        sunTexture.colorSpace = THREE.SRGBColorSpace;
        const sun_mat = new THREE.MeshStandardMaterial({
            map: sunTexture,
            color: 0xffffff,
            emissive: 0xff4400,
            emissiveIntensity: this.originalEmissiveIntensity,
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
            opacity: 0.22,
            side: THREE.BackSide
        });
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.group.add(this.corona);

        // Второй слой свечения
        const glowGeometry = new THREE.SphereGeometry(500, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa66,
            transparent: true,
            opacity: 0.14,
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

    getMesh() {
        return this.sun;
    }

    getPosition() {
        const worldPos = new THREE.Vector3();
        this.group.getWorldPosition(worldPos);
        return worldPos;
    }

    onHoverStart() {
        this.isHovered = true;

        if (this.sun) {
            this.sun.material.emissiveIntensity = this.hoverEmissiveIntensity;
        }

        if (this.corona) {
            this.corona.material.opacity = 0.34;
        }

        if (this.glow) {
            this.glow.material.opacity = 0.24;
        }
    }

    onHoverEnd() {
        this.isHovered = false;

        if (this.sun) {
            this.sun.material.emissiveIntensity = this.originalEmissiveIntensity;
        }

        if (this.corona) {
            this.corona.material.opacity = 0.22;
        }

        if (this.glow) {
            this.glow.material.opacity = 0.14;
        }
    }

    getDescription() {
        return this.description;
    }

    getContentKey() {
        return this.contentKey;
    }

    getLabelFallbackMarkup() {
        return `
            <div class="portfolio-label">
                <h3>${this.name}</h3>
                <p>${this.description}</p>
            </div>
        `;
    }

    getDetailsFallbackMarkup() {
        return `
            <section class="portfolio-details">
                <h2>${this.name}</h2>
                <p>${this.description}</p>
                <p>Update <code>public/content/${this.contentKey}/details.html</code> to replace this placeholder.</p>
            </section>
        `;
    }
}
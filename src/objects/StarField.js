import * as THREE from 'three';

export class StarField {
    constructor() {
        this.starField = null;
    }

    create() {
        const starCount = 3000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        const sphereRadius = 8000;
        const minRadius = 2000;

        for (let i = 0; i < starCount; i++) {
            const u = Math.random();
            const v = Math.random();

            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);

            const power = 2.5;
            const radiusFactor = Math.pow(Math.random(), power);
            const radius = minRadius + (sphereRadius - minRadius) * radiusFactor;
            const radiusJitter = 0.9 + Math.random() * 0.2;
            const finalRadius = radius * radiusJitter;

            const x = finalRadius * Math.sin(phi) * Math.cos(theta);
            const y = finalRadius * Math.sin(phi) * Math.sin(theta);
            const z = finalRadius * Math.cos(phi);

            starPositions[i * 3] = x;
            starPositions[i * 3 + 1] = y;
            starPositions[i * 3 + 2] = z;

            const distanceFactor = finalRadius / sphereRadius;
            const redshift = Math.min(1.0, distanceFactor * 1.5);
            const colorChoice = Math.random();

            if (colorChoice < 0.7) {
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = (1 - redshift * 0.2);
                starColors[i * 3 + 2] = (1 - redshift * 0.3);
            } else if (colorChoice < 0.85) {
                starColors[i * 3] = 0.7 * (1 - redshift * 0.1);
                starColors[i * 3 + 1] = 0.8 * (1 - redshift * 0.15);
                starColors[i * 3 + 2] = (1 - redshift * 0.2);
            } else {
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = 0.7 * (1 - redshift * 0.2);
                starColors[i * 3 + 2] = 0.5 * (1 - redshift * 0.3);
            }
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starMaterialPoints = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        this.starField = new THREE.Points(starGeometry, starMaterialPoints);
        return this.starField;
    }

    getStarField() {
        return this.starField;
    }
}
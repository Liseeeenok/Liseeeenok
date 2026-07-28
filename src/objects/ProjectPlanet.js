import * as THREE from 'three';
import { Planet } from '../abstract/Planet.js';

export class ProjectPlanet extends Planet {
    constructor(config) {
        super(config);
        this.surfaceType = config.surfaceType || 'rocky';
        this.bandColors = config.bandColors || [];
        this.texturePath = config.texturePath || null;

        if (this.texturePath) {
            this.originalEmissiveIntensity = 0;
            this.emissiveIntensity = 0;
        }
    }

    createCustomMaterial() {
        if (this.texturePath) {
            const texture = new THREE.TextureLoader().load(this.texturePath);
            texture.colorSpace = THREE.SRGBColorSpace;

            return new THREE.MeshStandardMaterial({
                map: texture,
                color: 0xffffff,
                metalness: 0,
                roughness: 1,
                emissive: 0xffffff,
                emissiveIntensity: 0
            });
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        if (this.surfaceType === 'gas' && this.bandColors.length > 0) {
            return this.createGasMaterial(ctx, canvas);
        }

        return this.createSolidPlanetMaterial(ctx, canvas);
    }

    createGasMaterial(ctx, canvas) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        this.bandColors.forEach((color, index) => {
            const stop = index / Math.max(this.bandColors.length - 1, 1);
            gradient.addColorStop(stop, color);
        });

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 22; i++) {
            const y = Math.random() * canvas.height;
            const h = 14 + Math.random() * 60;
            ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
            ctx.fillRect(0, y, canvas.width, h);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return new THREE.MeshStandardMaterial({
            map: texture,
            color: this.color,
            metalness: 0,
            roughness: 1,
            emissive: this.emissive,
            emissiveIntensity: this.emissiveIntensity
        });
    }

    createSolidPlanetMaterial(ctx, canvas) {
        const palettes = {
            rocky: ['#74482f', '#9a633f', '#c18754', '#53311d'],
            ice: ['#d7f6ff', '#a9ddff', '#7fc2ff', '#f2fdff'],
            dark: ['#3d4763', '#546381', '#6c7fa2', '#252c3f']
        };

        const palette = palettes[this.surfaceType] || palettes.rocky;
        ctx.fillStyle = palette[1];
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 420; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 4 + Math.random() * 22;
            const color = palette[Math.floor(Math.random() * palette.length)];
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.08 + Math.random() * 0.14;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this.surfaceType === 'ice') {
            for (let i = 0; i < 28; i++) {
                const y = Math.random() * canvas.height;
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(0, y, canvas.width, 4 + Math.random() * 10);
            }
        }

        if (this.surfaceType === 'dark') {
            for (let i = 0; i < 160; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = 2 + Math.random() * 10;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        return new THREE.MeshStandardMaterial({
            map: texture,
            color: this.color,
            metalness: 0,
            roughness: 1,
            emissive: this.emissive,
            emissiveIntensity: this.emissiveIntensity
        });
    }
}

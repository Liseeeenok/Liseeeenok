import * as THREE from 'three';

const textureCache = new Map();
const loader = new THREE.TextureLoader();

export function loadTexture(path) {
    if (textureCache.has(path)) {
        return Promise.resolve(textureCache.get(path));
    }

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                textureCache.set(path, texture);
                resolve(texture);
            },
            undefined,
            reject
        );
    });
}

export function getTextureLoader() {
    return loader;
}

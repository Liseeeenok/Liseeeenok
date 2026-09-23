import * as THREE from 'three';

export function isMobileViewport() {
    return window.innerWidth < 768;
}

export function isCoarsePointer() {
    return window.matchMedia('(pointer: coarse)').matches;
}

export function isSunObject(object) {
    return object.getContentKey?.() === 'about-me';
}

export function getDesktopPanelWidth() {
    return Math.min(window.innerWidth * 0.58, 920, Math.max(window.innerWidth - 360, 340));
}

export function getFocusMinDistance(object) {
    if (isSunObject(object)) {
        return Math.max(object.radius * 1.05, 200);
    }

    return Math.max(object.radius * 1.08, 8);
}

export function computeDesktopFocusFrame(object, camera, objectPos, startCameraPos, startTarget) {
    const worldUp = new THREE.Vector3(0, 1, 0);
    const isSun = isSunObject(object);
    const radius = object.radius;

    const viewDir = new THREE.Vector3().subVectors(startTarget, startCameraPos);
    if (viewDir.lengthSq() < 1) {
        viewDir.subVectors(objectPos, startCameraPos);
    }
    if (viewDir.lengthSq() < 1) {
        viewDir.set(0, -0.2, -1);
    }
    viewDir.normalize();

    let approachDir = new THREE.Vector3().subVectors(startCameraPos, objectPos);
    approachDir.y = 0;
    if (approachDir.lengthSq() < 1) {
        approachDir.copy(viewDir);
        approachDir.y = 0;
    }
    if (approachDir.lengthSq() < 1) {
        approachDir.set(0, 0, 1);
    }
    approachDir.normalize();

    const lookDir = approachDir.clone().negate();
    const screenRight = new THREE.Vector3().crossVectors(lookDir, worldUp);
    if (screenRight.lengthSq() < 0.0001) {
        screenRight.set(1, 0, 0);
    }
    screenRight.normalize();

    const panelWidth = getDesktopPanelWidth();
    const leftWidthRatio = Math.max((window.innerWidth - panelWidth - 40) / window.innerWidth, 0.34);
    const planetWidthRatio = leftWidthRatio * 0.82;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const angularHalfDiameter = hFov * planetWidthRatio * 0.5;

    let distance = radius / Math.tan(Math.max(angularHalfDiameter, 0.12));
    const minDistance = radius * (isSun ? 1.25 : 1.35);
    const maxDistance = radius * (isSun ? 2.8 : 3.4);
    distance = THREE.MathUtils.clamp(distance, minDistance, maxDistance);

    const targetCameraPos = new THREE.Vector3()
        .copy(objectPos)
        .addScaledVector(approachDir, distance);
    targetCameraPos.y = objectPos.y;

    const minSurfaceDistance = radius * (isSun ? 1.08 : 1.12);
    if (targetCameraPos.distanceTo(objectPos) < minSurfaceDistance) {
        const pullBackDir = targetCameraPos.clone().sub(objectPos);
        pullBackDir.y = 0;
        pullBackDir.normalize();
        targetCameraPos.copy(objectPos).addScaledVector(pullBackDir, minSurfaceDistance);
        targetCameraPos.y = objectPos.y;
    }

    // OrbitControls always keeps controls.target at screen center.
    // Shift the look-at point to the right so the planet appears on the left.
    const planetScreenX = 0.30;
    const offsetFraction = 0.5 - planetScreenX;
    const targetOffset = distance * Math.tan(hFov * offsetFraction);
    const targetTarget = objectPos.clone().addScaledVector(screenRight, targetOffset);
    targetTarget.y = objectPos.y;

    return {
        targetCameraPos,
        targetTarget
    };
}

export function isMobileViewport() {
    return window.innerWidth < 768;
}

export function isCoarsePointer() {
    return window.matchMedia('(pointer: coarse)').matches;
}

export function getDesktopPanelWidth() {
    return Math.min(window.innerWidth * 0.58, 920, Math.max(window.innerWidth - 360, 340));
}

export function getDesktopCameraFocus(object) {
    const panelRatio = getDesktopPanelWidth() / window.innerWidth;

    return {
        distance: object.radius * 0.48,
        targetOffset: object.radius * (0.35 + panelRatio * 0.75),
        verticalLift: Math.max(object.radius * 0.06, 4)
    };
}

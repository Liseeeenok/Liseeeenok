export function isMobileViewport() {
    return window.innerWidth < 768;
}

export function isCoarsePointer() {
    return window.matchMedia('(pointer: coarse)').matches;
}

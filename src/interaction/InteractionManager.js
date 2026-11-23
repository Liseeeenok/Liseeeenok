import * as THREE from 'three';
import { assetUrl } from '../utils/assetUrl.js';
import { computeDesktopFocusFrame, getFocusMinDistance, isCoarsePointer, isMobileViewport, isSunObject } from '../utils/viewport.js';

export class InteractionManager {
    constructor(scene, camera, renderer, cameraManager = null) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.cameraManager = cameraManager;
        this.controls = null;
        this.interactiveObjects = [];
        this.hoveredObject = null;
        this.selectedObject = null;
        this.tooltip = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.contentCache = new Map();
        this.activeTooltipRequest = 0;
        this.activeDetailsRequest = 0;
        this.currentLanguage = this.getInitialLanguage();
        this.languageSwitcher = null;
        this.objectLabels = [];
        this.lastPointerClientX = 0;
        this.lastPointerClientY = 0;
        this.cachedOcclusionPlanets = [];
        this.labelScreenPosition = new THREE.Vector3();
        this.labelCameraPosition = new THREE.Vector3();
        this.labelWorldPosition = new THREE.Vector3();
        this.labelObjectCenter = new THREE.Vector3();
        this.labelToObject = new THREE.Vector3();
        this.labelToOther = new THREE.Vector3();
        this.labelClosestPoint = new THREE.Vector3();
        this.labelFrameCounter = 0;
        this.useTouchInteraction = isCoarsePointer();
        this.pointerDownX = 0;
        this.pointerDownY = 0;
        this.pointerDownTime = 0;
        this.backdrop = null;
        this.mobileHint = null;

        // Параметры анимации камеры
        this.isAnimatingToPlanet = false;
        this.animationProgress = 0;
        this.animationDuration = 1.5; // секунды
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.targetTarget = new THREE.Vector3();
        this.overviewMinDistance = 800;
        this.overviewMaxDistance = 7000;
        this.viewDirection = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();

        this.initTooltip();
        this.initInfoPanel();
        this.initBackdrop();
        this.initMobileHint();
        this.initLanguageSwitcher();
        this.setupEventListeners();
        this.setMobileHintVisible(isMobileViewport() || this.useTouchInteraction);
    }

    getInitialLanguage() {
        const savedLanguage = window.localStorage.getItem('portfolio-language');
        return savedLanguage === 'en' ? 'en' : 'ru';
    }

    initLanguageSwitcher() {
        this.languageSwitcher = document.createElement('div');
        this.languageSwitcher.className = 'language-switcher';
        document.body.appendChild(this.languageSwitcher);
        this.renderLanguageSwitcher();
    }

    renderLanguageSwitcher() {
        if (!this.languageSwitcher) return;

        this.languageSwitcher.innerHTML = `
            <button type="button" data-lang="ru" class="${this.currentLanguage === 'ru' ? 'is-active' : ''}">RU</button>
            <button type="button" data-lang="en" class="${this.currentLanguage === 'en' ? 'is-active' : ''}">EN</button>
        `;

        this.languageSwitcher.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => {
                this.setLanguage(button.dataset.lang);
            });
        });
    }

    setLanguage(language) {
        if (!language || language === this.currentLanguage) return;

        this.currentLanguage = language;
        window.localStorage.setItem('portfolio-language', language);
        this.renderLanguageSwitcher();
        this.updateMobileHintText();

        // Подписи на сцене тоже меняют язык, а не только тексты в панели.
        this.objectLabels.forEach(({ object, element }) => {
            element.textContent = object.getShortLabel ? object.getShortLabel(language) : object.name;
        });

        if (this.selectedObject && !this.isAnimatingToPlanet) {
            this.showInfoPanel(this.selectedObject);
        }

        if (this.hoveredObject && this.tooltip.classList.contains('is-visible')) {
            this.showTooltip(this.hoveredObject, this.lastPointerClientX, this.lastPointerClientY);
        }
    }

    initTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'portfolio-tooltip';
        document.body.appendChild(this.tooltip);
    }

    initBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'portfolio-backdrop';
        this.backdrop.addEventListener('click', (event) => {
            event.stopPropagation();
            this.closeInfoPanel();
        });
        document.body.appendChild(this.backdrop);
    }

    initMobileHint() {
        this.mobileHint = document.createElement('div');
        this.mobileHint.className = 'mobile-hint';
        this.mobileHint.textContent = this.currentLanguage === 'en'
            ? 'Tap a planet · Swipe to rotate'
            : 'Нажмите на планету · Свайп для вращения';
        document.body.appendChild(this.mobileHint);
    }

    updateMobileHintText() {
        if (!this.mobileHint) return;

        this.mobileHint.textContent = this.currentLanguage === 'en'
            ? 'Tap a planet · Swipe to rotate'
            : 'Нажмите на планету · Свайп для вращения';
    }

    setMobileHintVisible(isVisible) {
        if (!this.mobileHint) return;
        this.mobileHint.classList.toggle('is-hidden', !isVisible);
    }

    initInfoPanel() {
        this.infoPanel = document.createElement('aside');
        this.infoPanel.className = 'portfolio-info-panel';
        this.infoPanel.setAttribute('role', 'dialog');
        this.infoPanel.setAttribute('aria-modal', 'true');
        document.body.appendChild(this.infoPanel);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.infoPanel.classList.contains('is-open')) {
                this.closeInfoPanel();
            }
        });
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;
        canvas.style.cursor = 'default';

        canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
        canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
        canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
        canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
        canvas.addEventListener('click', this.onClick.bind(this));
    }

    updatePointerFromEvent(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    getInteractiveMeshes() {
        return this.interactiveObjects
            .map((object) => object.getMesh())
            .filter((mesh) => mesh !== null);
    }

    findObjectFromEvent(event) {
        this.updatePointerFromEvent(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.getInteractiveMeshes());
        if (intersects.length === 0) {
            return null;
        }

        const hitMesh = intersects[0].object;
        return this.interactiveObjects.find((object) => object.getMesh() === hitMesh) || null;
    }

    onPointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        this.pointerDownX = event.clientX;
        this.pointerDownY = event.clientY;
        this.pointerDownTime = Date.now();
    }

    onPointerUp(event) {
        if (event.pointerType === 'mouse') {
            return;
        }

        if (this.isAnimatingToPlanet) {
            return;
        }

        const deltaX = Math.abs(event.clientX - this.pointerDownX);
        const deltaY = Math.abs(event.clientY - this.pointerDownY);
        const elapsed = Date.now() - this.pointerDownTime;
        const isTap = deltaX < 14 && deltaY < 14 && elapsed < 350;

        if (!isTap) {
            return;
        }

        const hitObject = this.findObjectFromEvent(event);
        if (hitObject) {
            this.selectObject(hitObject);
            this.setMobileHintVisible(false);
        }
    }

    onClick(event) {
        if (this.isAnimatingToPlanet || isCoarsePointer()) {
            return;
        }

        const hitObject = this.findObjectFromEvent(event);
        if (hitObject) {
            this.selectObject(hitObject);
        }
    }

    onPointerMove(event) {
        this.lastPointerClientX = event.clientX;
        this.lastPointerClientY = event.clientY;

        if (this.useTouchInteraction || event.pointerType === 'touch') {
            return;
        }

        this.updatePointerFromEvent(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.getInteractiveMeshes());

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitObject = this.interactiveObjects.find((object) => object.getMesh() === hitMesh);

            if (hitObject) {
                this.hoverObject(hitObject, event.clientX, event.clientY);
                this.renderer.domElement.style.cursor = 'pointer';
                return;
            }
        }

        this.unhoverObject();
        this.renderer.domElement.style.cursor = 'default';
    }

    onPointerLeave() {
        this.unhoverObject();
        this.renderer.domElement.style.cursor = 'default';
        this.hideTooltip();
    }

    registerInteractiveObject(object) {
        this.interactiveObjects.push(object);
        this.rebuildOcclusionCache();

        if (object.getContentKey() !== 'about-me') {
            this.createObjectLabel(object);
        }
    }

    rebuildOcclusionCache() {
        // Солнце тоже перекрывает подписи: планета за его диском не должна подписываться.
        this.cachedOcclusionPlanets = this.interactiveObjects
            .filter((object) => object.getMesh())
            .map((object) => ({
                object,
                radius: object.radius || 50
            }));
    }

    createObjectLabel(object) {
        const label = document.createElement('div');
        label.className = 'planet-label';
        label.textContent = object.getShortLabel ? object.getShortLabel(this.currentLanguage) : object.name;
        label.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectObject(object);
        });
        document.body.appendChild(label);
        this.objectLabels.push({ object, element: label });
    }

    findInteractiveObjectByContentKey(contentKey) {
        return this.interactiveObjects.find((object) => object.getContentKey() === contentKey);
    }

    applyFocusControlsConstraints(object) {
        if (!this.controls || !object) return;

        this.controls.minDistance = getFocusMinDistance(object);
        this.controls.maxDistance = isSunObject(object)
            ? Math.max(object.radius * 3.5, 1600)
            : Math.max(object.radius * 2.5, 250);
    }

    applyOverviewControlsConstraints() {
        if (!this.controls) return;

        this.controls.minDistance = this.overviewMinDistance;
        this.controls.maxDistance = this.overviewMaxDistance;
    }

    applyAnimationControlsConstraints(object = null) {
        if (!this.controls) return;

        this.controls.enabled = false;
        this.controls.minDistance = object ? Math.max(getFocusMinDistance(object) * 0.85, 4) : 4;
        this.controls.maxDistance = 12000;
        this.controls.enableDamping = false;
    }

    hideInfoPanelUI() {
        this.infoPanel.classList.remove('is-open');
        this.backdrop.classList.remove('is-visible');
        document.body.classList.remove('panel-open');
    }

    finalizeCameraAnimation() {
        this.camera.position.copy(this.targetCameraPos);

        if (this.controls) {
            this.controls.target.copy(this.targetTarget);
            this.controls.enableDamping = true;
            this.controls.enabled = true;

            if (this.selectedObject) {
                this.applyFocusControlsConstraints(this.selectedObject);
            } else {
                this.applyOverviewControlsConstraints();
            }

            this.controls.update();
        }

        if (this.selectedObject) {
            this.showInfoPanel(this.selectedObject);
        }
    }

    goToAboutMe() {
        const aboutMeObject = this.findInteractiveObjectByContentKey('about-me');

        if (aboutMeObject) {
            this.selectObject(aboutMeObject);
        }
    }

    hoverObject(object, x, y) {
        if (object.instantStop) {
            if (this.hoveredObject) {
                this.hoveredObject.onHoverEnd();
            }
            return;
        }

        if (this.hoveredObject !== object) {
            if (this.hoveredObject) {
                this.hoveredObject.onHoverEnd();
            }

            this.hoveredObject = object;
            object.onHoverStart();
        }

        if (object.forceLoadTexture) {
            object.forceLoadTexture();
        }

        this.showTooltip(object, x, y);
    }

    unhoverObject() {
        if (this.hoveredObject) {
            this.hoveredObject.onHoverEnd();
            this.hoveredObject = null;
            this.hideTooltip();
        }
    }

    selectObject(object) {
        if (this.selectedObject === object) return;

        if (this.hoveredObject) {
            this.hoveredObject.onHoverEnd();
            this.hoveredObject = null;
        }

        if (this.selectedObject) {
            this.selectedObject.onHoverEnd();
            this.selectedObject.isSlowed = false;
            this.selectedObject.instantStop = false;

            if (this.selectedObject.outerGlowMesh) {
                this.selectedObject.outerGlowMesh.material.opacity = 0.08;
            }
        }

        this.selectedObject = object;
        object.isSlowed = true;

        object.instantStop = true;

        if (object.forceLoadTexture) {
            object.forceLoadTexture();
        }

        if (object.outerGlowMesh) {
            object.outerGlowMesh.material.opacity = 0;
        }

        this.hideInfoPanelUI();
        this.animateCameraToObject(object);

        this.hideTooltip();
    }

    animateCameraToObject(object) {
        const objectPos = object.getPosition();
        const mobile = isMobileViewport();

        this.applyAnimationControlsConstraints(object);

        this.startCameraPos.copy(this.camera.position);

        if (this.controls) {
            this.startTarget.copy(this.controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }

        if (mobile) {
            const verticalLift = Math.max(object.radius * 0.12, 10);
            const distance = Math.max(object.radius * 1.28, object.radius + 20) * 1.2;
            const forward = new THREE.Vector3().subVectors(objectPos, this.startCameraPos).normalize();

            this.targetCameraPos.set(
                objectPos.x - forward.x * distance,
                objectPos.y - forward.y * distance + verticalLift,
                objectPos.z - forward.z * distance
            );
            this.targetTarget.copy(objectPos);
        } else {
            const frame = computeDesktopFocusFrame(
                object,
                this.camera,
                objectPos,
                this.startCameraPos,
                this.startTarget
            );

            this.targetCameraPos.copy(frame.targetCameraPos);
            this.targetTarget.copy(frame.targetTarget);
        }

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    async showInfoPanel(object) {
        this.infoPanel.innerHTML = `
            <div class="portfolio-info-panel__handle" aria-hidden="true"></div>
            <div class="portfolio-info-panel__header">
                <div class="portfolio-info-panel__title">${object.getShortLabel ? object.getShortLabel(this.currentLanguage) : object.name}</div>
                <div class="portfolio-info-panel__actions">
                    <button type="button" id="goToAboutBtn" class="portfolio-info-panel__btn portfolio-info-panel__btn--about">AboutMe</button>
                    <button type="button" id="closeInfoBtn" class="portfolio-info-panel__btn portfolio-info-panel__btn--close" aria-label="Close">✕</button>
                </div>
            </div>
            <div class="portfolio-content-body portfolio-info-panel__body">Loading...</div>
        `;

        const aboutButton = this.infoPanel.querySelector('#goToAboutBtn');
        if (aboutButton) {
            aboutButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goToAboutMe();
            });
        }

        const closeBtn = this.infoPanel.querySelector('#closeInfoBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeInfoPanel();
            });
        }

        this.infoPanel.classList.add('is-open');
        if (isMobileViewport()) {
            this.backdrop.classList.add('is-visible');
            document.body.classList.add('panel-open');
        } else {
            this.backdrop.classList.remove('is-visible');
            document.body.classList.remove('panel-open');
        }
        this.setMobileHintVisible(false);

        const contentBody = this.infoPanel.querySelector('.portfolio-info-panel__body');
        const requestId = ++this.activeDetailsRequest;
        const detailsMarkup = await this.loadContentMarkup(object, 'details');

        if (requestId === this.activeDetailsRequest && contentBody) {
            contentBody.innerHTML = detailsMarkup;
            this.hydrateContent(contentBody);
            this.bindContentActions(contentBody);
        }
    }

    /**
     * Картинки в описаниях лежат относительно каталога контента и не знают про base path,
     * поэтому путь из data-asset разворачивает assetUrl. Клик открывает снимок во весь экран.
     */
    hydrateContent(container) {
        if (!container) return;

        container.querySelectorAll('img[data-asset]').forEach((img) => {
            img.src = assetUrl(img.dataset.asset);
            img.addEventListener('click', (event) => {
                // После свайпа по карусели клик не должен открывать просмотр.
                if (img.dataset.suppressZoom === '1') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                this.openLightbox(img.src, img.alt);
            });
        });

        container.querySelectorAll('[data-gallery]').forEach((gallery) => this.initPhotoGallery(gallery));
    }

    /**
     * Карусель фотографий в профиле: стрелки, точки, свайп пальцем.
     * Слайды лежат в треке и сдвигаются трансформом — без плагинов и скролла.
     */
    initPhotoGallery(gallery) {
        const track = gallery.querySelector('.photo-slider__track');
        const slides = Array.from(gallery.querySelectorAll('.photo-slider__slide'));
        const dots = Array.from(gallery.querySelectorAll('.photo-slider__dot'));
        const prevButton = gallery.querySelector('.photo-slider__nav--prev');
        const nextButton = gallery.querySelector('.photo-slider__nav--next');

        if (!track || slides.length < 2) {
            return;
        }

        // Картинки не должны перетаскиваться: иначе на десктопе drag мышью
        // запускает браузерное перетаскивание, а не листание.
        gallery.querySelectorAll('img').forEach((img) => {
            img.draggable = false;
        });

        let index = 0;

        const render = () => {
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === index));
            slides.forEach((slide, slideIndex) => {
                slide.setAttribute('aria-hidden', slideIndex === index ? 'false' : 'true');
            });
        };

        const go = (step) => {
            index = (index + step + slides.length) % slides.length;
            render();
        };

        const stop = (event) => event.stopPropagation();

        if (prevButton) {
            prevButton.addEventListener('click', (event) => {
                stop(event);
                go(-1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', (event) => {
                stop(event);
                go(1);
            });
        }

        dots.forEach((dot, dotIndex) => {
            dot.addEventListener('click', (event) => {
                stop(event);
                index = dotIndex;
                render();
            });
        });

        // Свайп: порог 40 px, вертикальный жест отдаём прокрутке панели.
        const threshold = 40;
        let startX = 0;
        let startY = 0;
        let dragging = false;

        track.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            startX = event.clientX;
            startY = event.clientY;
            dragging = true;
        });

        track.addEventListener('pointerup', (event) => {
            if (!dragging) return;
            dragging = false;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (Math.abs(dx) <= threshold || Math.abs(dx) <= Math.abs(dy)) {
                return;
            }

            go(dx < 0 ? 1 : -1);

            // 350 мс после свайпа гасим открытие просмотра по клику.
            gallery.querySelectorAll('img').forEach((img) => {
                img.dataset.suppressZoom = '1';
                setTimeout(() => {
                    delete img.dataset.suppressZoom;
                }, 350);
            });
        });

        track.addEventListener('pointercancel', () => {
            dragging = false;
        });

        render();
    }

    openLightbox(src, alt) {
        if (!this.lightbox) {
            this.lightbox = document.createElement('div');
            this.lightbox.className = 'portfolio-lightbox';
            this.lightbox.innerHTML = '<img alt="">';
            this.lightbox.addEventListener('click', () => this.closeLightbox());
            document.body.appendChild(this.lightbox);
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.closeLightbox();
                }
            });
        }

        const image = this.lightbox.querySelector('img');
        image.src = src;
        image.alt = alt || '';
        this.lightbox.classList.add('is-open');
    }

    closeLightbox() {
        if (this.lightbox) {
            this.lightbox.classList.remove('is-open');
        }
    }

    bindContentActions(container) {
        container.querySelectorAll('[data-project-target]').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                const targetKey = link.dataset.projectTarget;
                const targetObject = this.findInteractiveObjectByContentKey(targetKey);

                if (targetObject) {
                    this.selectObject(targetObject);
                }
            });
        });
    }

    closeInfoPanel() {
        if (!this.selectedObject) return;

        this.selectedObject.isSlowed = false;
        this.selectedObject.instantStop = false;

        if (this.selectedObject.outerGlowMesh) {
            this.selectedObject.outerGlowMesh.material.opacity = 0.08;
        }

        this.selectedObject.onHoverEnd();
        this.selectedObject = null;
        this.activeDetailsRequest += 1;

        this.hideInfoPanelUI();
        this.setMobileHintVisible(isMobileViewport() || this.useTouchInteraction);

        this.resetCameraPosition();
    }

    resetCameraPosition() {
        this.startCameraPos.copy(this.camera.position);

        if (this.controls) {
            this.startTarget.copy(this.controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }

        this.applyAnimationControlsConstraints();

        if (this.cameraManager) {
            this.targetCameraPos.copy(this.cameraManager.getDefaultPosition());
            this.targetTarget.copy(this.cameraManager.getDefaultTarget());
        } else {
            this.targetCameraPos.set(4000, 1600, 2000);
            this.targetTarget.set(0, 0, 0);
        }

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    async showTooltip(object, x, y) {
        if (this.useTouchInteraction) {
            return;
        }

        const offsetX = 16;
        const offsetY = -16;
        const tooltipWidth = Math.min(280, window.innerWidth - 32);
        const tooltipHeight = 120;

        let tooltipX = x + offsetX;
        let tooltipY = y + offsetY;

        if (tooltipX + tooltipWidth > window.innerWidth - 16) {
            tooltipX = x - tooltipWidth - offsetX;
        }
        if (tooltipY < 16) {
            tooltipY = y + Math.abs(offsetY);
        }
        if (tooltipY + tooltipHeight > window.innerHeight - 16) {
            tooltipY = window.innerHeight - tooltipHeight - 16;
        }

        this.tooltip.style.left = `${Math.max(16, tooltipX)}px`;
        this.tooltip.style.top = `${Math.max(16, tooltipY)}px`;
        this.tooltip.classList.add('is-visible');
        this.tooltip.innerHTML = '<div class="portfolio-content-body">Loading...</div>';

        const requestId = ++this.activeTooltipRequest;
        const labelMarkup = await this.loadContentMarkup(object, 'label');

        if (requestId === this.activeTooltipRequest && this.hoveredObject === object) {
            this.tooltip.innerHTML = labelMarkup;
        }
    }

    hideTooltip() {
        this.tooltip.classList.remove('is-visible');
        this.activeTooltipRequest += 1;
    }

    async loadContentMarkup(object, type) {
        const cacheKey = `${this.currentLanguage}:${object.getContentKey()}:${type}`;

        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey);
        }

        const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';
        const cacheBust = buildId ? `?v=${buildId}` : '';

        const paths = [
            assetUrl(`content/${this.currentLanguage}/${object.getContentKey()}/${type}.html${cacheBust}`),
            assetUrl(`content/${object.getContentKey()}/${type}.html${cacheBust}`)
        ];

        let markup = type === 'label'
            ? object.getLabelFallbackMarkup()
            : object.getDetailsFallbackMarkup();

        for (const path of paths) {
            try {
                const response = await fetch(path);

                if (!response.ok) {
                    continue;
                }

                markup = await response.text();

                if (markup.trim()) {
                    break;
                }
            } catch (error) {
                console.warn(`Failed to load content from ${path}`, error);
            }
        }

        this.contentCache.set(cacheKey, markup);
        return markup;
    }

    onResize() {
        this.useTouchInteraction = isCoarsePointer();

        if (this.infoPanel.classList.contains('is-open')) {
            if (isMobileViewport()) {
                this.backdrop.classList.add('is-visible');
                document.body.classList.add('panel-open');
            } else {
                this.backdrop.classList.remove('is-visible');
                document.body.classList.remove('panel-open');
            }
            this.setMobileHintVisible(false);
        } else {
            this.setMobileHintVisible(isMobileViewport() || this.useTouchInteraction);
        }
    }

    update(controls) {
        // Сохраняем ссылку на controls если ее нет
        if (controls && !this.controls) {
            this.controls = controls;
        }

        // Обновляем анимацию камеры
        if (this.isAnimatingToPlanet) {
            this.animationProgress += 0.02;

            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimatingToPlanet = false;
                this.finalizeCameraAnimation();
            } else {
                const t = this.easeInOutCubic(this.animationProgress);

                this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, t);

                if (this.controls) {
                    this.controls.target.lerpVectors(this.startTarget, this.targetTarget, t);
                }
            }
        }

        this.updateObjectLabels();
    }

    shouldUpdateLabels() {
        if (isMobileViewport() || this.useTouchInteraction) {
            return false;
        }

        this.labelFrameCounter += 1;

        if (this.isAnimatingToPlanet) {
            return true;
        }

        return this.labelFrameCounter % 2 === 0;
    }

    /**
     * Перекрыта ли точка лучом из камеры каким-либо телом сцены (Солнце, планета).
     * Считаем по сфере радиуса тела: подпись, стоящая над планетой, тоже должна гаснуть,
     * если планета ушла за диск Солнца или за соседнюю планету.
     */
    isPointOccluded(point, ignoredObject) {
        this.labelCameraPosition.copy(this.camera.position);
        this.labelToObject.subVectors(point, this.labelCameraPosition);
        const distanceToPoint = this.labelToObject.length();

        if (distanceToPoint === 0) {
            return false;
        }

        this.labelToObject.multiplyScalar(1 / distanceToPoint);

        for (const { object: otherObject, radius } of this.cachedOcclusionPlanets) {
            if (otherObject === ignoredObject) {
                continue;
            }

            const otherCenter = otherObject.getPosition();
            this.labelToOther.subVectors(otherCenter, this.labelCameraPosition);
            const otherDistance = this.labelToOther.length();

            // Тело дальше самой точки ничего не перекрывает.
            if (otherDistance >= distanceToPoint) {
                continue;
            }

            const projection = this.labelToOther.dot(this.labelToObject);

            if (projection <= 0) {
                continue;
            }

            this.labelClosestPoint.copy(this.labelCameraPosition).addScaledVector(this.labelToObject, projection);
            const distToLine = otherCenter.distanceTo(this.labelClosestPoint);

            if (distToLine < radius * 0.95) {
                return true;
            }
        }

        return false;
    }

    hideObjectLabel(element) {
        element.style.opacity = '0';
        // Невидимая подпись не должна перехватывать клик по сцене.
        element.style.pointerEvents = 'none';
    }

    updateObjectLabels() {
        if (!this.shouldUpdateLabels()) {
            return;
        }

        this.objectLabels.forEach(({ object, element }) => {
            this.labelWorldPosition.copy(object.getPosition());
            this.labelWorldPosition.y += Math.max(object.radius + 24, 42);
            this.labelScreenPosition.copy(this.labelWorldPosition).project(this.camera);

            const isVisible = this.labelScreenPosition.z < 1 &&
                this.labelScreenPosition.z > -1 &&
                Math.abs(this.labelScreenPosition.x) <= 1.2 &&
                Math.abs(this.labelScreenPosition.y) <= 1.2;

            if (!isVisible) {
                this.hideObjectLabel(element);
                return;
            }

            this.labelObjectCenter.copy(object.getPosition());

            // Гасим подпись, если закрыт сам объект или точка, над которой она висит:
            // иначе подпись остаётся висеть на диске Солнца, когда планета уже за ним.
            if (
                this.isPointOccluded(this.labelObjectCenter, object) ||
                this.isPointOccluded(this.labelWorldPosition, object)
            ) {
                this.hideObjectLabel(element);
                return;
            }

            const x = (this.labelScreenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-this.labelScreenPosition.y * 0.5 + 0.5) * window.innerHeight;

            element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            element.style.opacity = object === this.selectedObject ? '0.35' : '1';
            element.style.pointerEvents = '';
        });
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    dispose() {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
        }
        if (this.backdrop) {
            document.body.removeChild(this.backdrop);
        }
        if (this.mobileHint) {
            document.body.removeChild(this.mobileHint);
        }
        if (this.infoPanel) {
            document.body.removeChild(this.infoPanel);
        }
        if (this.languageSwitcher) {
            document.body.removeChild(this.languageSwitcher);
        }
        this.objectLabels.forEach(({ element }) => {
            document.body.removeChild(element);
        });
        document.body.classList.remove('panel-open');
    }
}
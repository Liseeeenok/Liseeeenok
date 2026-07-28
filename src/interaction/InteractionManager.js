import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
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
        this.lastPointerClientX = 0;
        this.lastPointerClientY = 0;

        // Параметры анимации камеры
        this.isAnimatingToPlanet = false;
        this.animationProgress = 0;
        this.animationDuration = 1.5; // секунды
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.targetTarget = new THREE.Vector3();

        this.initTooltip();
        this.initInfoPanel();
        this.initLanguageSwitcher();
        this.setupEventListeners();
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

        if (this.selectedObject) {
            this.showInfoPanel(this.selectedObject);
        }

        if (this.hoveredObject && this.tooltip.style.display !== 'none') {
            this.showTooltip(this.hoveredObject, this.lastPointerClientX, this.lastPointerClientY);
        }
    }

    initTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.display = 'none';
        this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '12px 16px';
        this.tooltip.style.borderRadius = '8px';
        this.tooltip.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        this.tooltip.style.backdropFilter = 'blur(10px)';
        this.tooltip.style.fontFamily = 'Arial, sans-serif';
        this.tooltip.style.fontSize = '14px';
        this.tooltip.style.maxWidth = '250px';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        this.tooltip.style.zIndex = '1000';
        this.tooltip.style.transition = 'opacity 0.2s ease';
        document.body.appendChild(this.tooltip);
    }

    initInfoPanel() {
        this.infoPanel = document.createElement('div');
        this.infoPanel.style.position = 'absolute';
        this.infoPanel.style.display = 'none';
        this.infoPanel.style.backgroundColor = 'rgba(10, 10, 30, 0.92)';
        this.infoPanel.style.color = 'white';
        this.infoPanel.style.padding = '24px 28px';
        this.infoPanel.style.borderRadius = '16px';
        this.infoPanel.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        this.infoPanel.style.backdropFilter = 'blur(20px)';
        this.infoPanel.style.fontFamily = 'Arial, sans-serif';
        this.infoPanel.style.width = 'min(58vw, 920px)';
        this.infoPanel.style.minWidth = '340px';
        this.infoPanel.style.maxWidth = 'calc(100vw - 360px)';
        this.infoPanel.style.height = 'calc(100vh - 92px)';
        this.infoPanel.style.maxHeight = 'none';
        this.infoPanel.style.overflowY = 'auto';
        this.infoPanel.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.7)';
        this.infoPanel.style.zIndex = '2000';
        this.infoPanel.style.top = '72px';
        this.infoPanel.style.left = 'auto';
        this.infoPanel.style.right = '20px';
        this.infoPanel.style.transform = 'none';
        this.infoPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        this.infoPanel.style.borderRadius = '16px';
        document.body.appendChild(this.infoPanel);

        // Закрытие по клику вне панели
        document.addEventListener('click', (e) => {
            if (this.infoPanel.style.display !== 'none' && 
                !this.infoPanel.contains(e.target) && 
                e.target !== this.renderer.domElement) {
                this.closeInfoPanel();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.infoPanel.style.display !== 'none') {
                this.closeInfoPanel();
            }
        });
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;
        canvas.style.cursor = 'default';

        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        canvas.addEventListener('click', this.onClick.bind(this));
    }

    registerInteractiveObject(object) {
        this.interactiveObjects.push(object);
    }

    findInteractiveObjectByContentKey(contentKey) {
        return this.interactiveObjects.find((object) => object.getContentKey() === contentKey);
    }

    goToAboutMe() {
        const aboutMeObject = this.findInteractiveObjectByContentKey('about-me');

        if (aboutMeObject) {
            this.selectObject(aboutMeObject);
        }
    }

    onMouseMove(event) {
        this.lastPointerClientX = event.clientX;
        this.lastPointerClientY = event.clientY;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = this.interactiveObjects
            .map((object) => object.getMesh())
            .filter(mesh => mesh !== null);

        const intersects = this.raycaster.intersectObjects(meshes);

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

    onMouseLeave() {
        this.unhoverObject();
        this.renderer.domElement.style.cursor = 'default';
        this.hideTooltip();
    }

    onClick(event) {
        if (this.isAnimatingToPlanet) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = this.interactiveObjects
            .map((object) => object.getMesh())
            .filter(mesh => mesh !== null);

        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitObject = this.interactiveObjects.find((object) => object.getMesh() === hitMesh);

            if (hitObject) {
                this.selectObject(hitObject);
            }
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

        if (object.outerGlowMesh) {
            object.outerGlowMesh.material.opacity = 0;
        }

        this.showInfoPanel(object);

        this.animateCameraToObject(object);

        this.hideTooltip();
    }

    animateCameraToObject(object) {
        const objectPos = object.getPosition();
        
        this.startCameraPos.copy(this.camera.position);
        
        if (this.controls) {
            this.startTarget.copy(this.controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }

        const forward = new THREE.Vector3().subVectors(objectPos, this.startCameraPos).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        const verticalLift = Math.max(object.radius * 0.12, 10);
        const distance = Math.max(object.radius * 1.28, object.radius + 20);

        this.targetCameraPos.set(
            objectPos.x - forward.x * distance,
            objectPos.y - forward.y * distance + verticalLift,
            objectPos.z - forward.z * distance
        );

        this.targetTarget.copy(objectPos).add(right.multiplyScalar(object.radius * 1.5));

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    async showInfoPanel(object) {
        this.infoPanel.innerHTML = `
            <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
                <div style="position: absolute; top: 0; right: 0; display: flex; gap: 8px; z-index: 2;">
                    <button id="goToAboutBtn" style="
                        background: rgba(136,204,255,0.12);
                        border: 1px solid rgba(136,204,255,0.25);
                        color: white;
                        font-size: 12px;
                        cursor: pointer;
                        padding: 7px 10px;
                        border-radius: 999px;
                        transition: background 0.2s;
                    ">AboutMe</button>
                    <button id="closeInfoBtn" style="
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 4px 12px;
                        border-radius: 8px;
                        transition: background 0.2s;
                    ">✕</button>
                </div>
                <div class="portfolio-content-body" style="flex: 1; overflow-y: auto; padding-top: 8px; padding-right: 6px;">Loading...</div>
            </div>
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

        this.infoPanel.style.display = 'block';
        this.infoPanel.style.opacity = '1';
        this.infoPanel.style.transform = 'none';

        const contentBody = this.infoPanel.querySelector('.portfolio-content-body');
        const requestId = ++this.activeDetailsRequest;
        const detailsMarkup = await this.loadContentMarkup(object, 'details');

        if (requestId === this.activeDetailsRequest && contentBody) {
            contentBody.innerHTML = detailsMarkup;
            this.bindContentActions(contentBody);
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

        this.infoPanel.style.display = 'none';

        this.resetCameraPosition();
    }

    resetCameraPosition() {
        // Сохраняем текущую позицию камеры как начальную для анимации
        this.startCameraPos.copy(this.camera.position);

        if (this.controls) {
            this.startTarget.copy(this.controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }
        
        // Целевая позиция - исходное положение камеры
        this.targetCameraPos.set(3000, 600, 2000);
        this.targetTarget.set(0, 0, 0);

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    async showTooltip(object, x, y) {
        const offsetX = 20;
        const offsetY = -20;
        
        let tooltipX = x + offsetX;
        let tooltipY = y + offsetY;

        // Проверяем, чтобы тултип не выходил за экран
        const tooltipWidth = 250;
        const tooltipHeight = 100;
        if (tooltipX + tooltipWidth > window.innerWidth) {
            tooltipX = x - tooltipWidth - offsetX;
        }
        if (tooltipY + tooltipHeight > window.innerHeight) {
            tooltipY = y - tooltipHeight - offsetY;
        }

        this.tooltip.style.left = tooltipX + 'px';
        this.tooltip.style.top = tooltipY + 'px';
        this.tooltip.style.display = 'block';
        this.tooltip.style.opacity = '1';

        this.tooltip.innerHTML = '<div class="portfolio-content-body">Loading...</div>';

        const requestId = ++this.activeTooltipRequest;
        const labelMarkup = await this.loadContentMarkup(object, 'label');

        if (requestId === this.activeTooltipRequest && this.hoveredObject === object) {
            this.tooltip.innerHTML = labelMarkup;
        }
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
        this.tooltip.style.opacity = '0';
        this.activeTooltipRequest += 1;
    }

    async loadContentMarkup(object, type) {
        const cacheKey = `${this.currentLanguage}:${object.getContentKey()}:${type}`;

        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey);
        }

        const paths = [
            `/content/${this.currentLanguage}/${object.getContentKey()}/${type}.html`,
            `/public/content/${this.currentLanguage}/${object.getContentKey()}/${type}.html`,
            `/content/${object.getContentKey()}/${type}.html`,
            `/public/content/${object.getContentKey()}/${type}.html`
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

    onResize() {}

    update(controls) {
        // Сохраняем ссылку на controls если ее нет
        if (controls && !this.controls) {
            this.controls = controls;
        }

        // Обновляем анимацию камеры
        if (this.isAnimatingToPlanet) {
            this.animationProgress += 0.02; // Скорость анимации
            
            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimatingToPlanet = false;
            }

            // Плавная интерполяция
            const t = this.easeInOutCubic(this.animationProgress);
            
            this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, t);
            
            if (this.controls) {
                this.controls.target.lerpVectors(this.startTarget, this.targetTarget, t);
                this.controls.update();
            }
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    dispose() {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
        }
        if (this.infoPanel) {
            document.body.removeChild(this.infoPanel);
        }
        if (this.languageSwitcher) {
            document.body.removeChild(this.languageSwitcher);
        }
    }
}
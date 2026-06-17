import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class InteractionManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.planets = [];
        this.hoveredPlanet = null;
        this.selectedPlanet = null;
        this.labelRenderer = null;
        this.tooltip = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();

        // Параметры анимации камеры
        this.isAnimatingToPlanet = false;
        this.animationProgress = 0;
        this.animationDuration = 1.5; // секунды
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.targetTarget = new THREE.Vector3();

        this.initLabelRenderer();
        this.initTooltip();
        this.initInfoPanel();
        this.setupEventListeners();
    }

    initLabelRenderer() {
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.left = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
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
        this.infoPanel.style.padding = '24px 30px';
        this.infoPanel.style.borderRadius = '16px';
        this.infoPanel.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        this.infoPanel.style.backdropFilter = 'blur(20px)';
        this.infoPanel.style.fontFamily = 'Arial, sans-serif';
        this.infoPanel.style.maxWidth = '400px';
        this.infoPanel.style.minWidth = '300px';
        this.infoPanel.style.maxHeight = '80vh';
        this.infoPanel.style.overflowY = 'auto';
        this.infoPanel.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.7)';
        this.infoPanel.style.zIndex = '2000';
        this.infoPanel.style.top = '50%';
        this.infoPanel.style.left = '75%';
        this.infoPanel.style.transform = 'translate(-50%, -50%)';
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
        window.addEventListener('resize', this.onResize.bind(this));
    }

    registerPlanet(planet) {
        this.planets.push(planet);
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Собираем все меши планет
        const meshes = this.planets
            .map(planet => planet.getMesh())
            .filter(mesh => mesh !== null);

        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitPlanet = this.planets.find(p => p.getMesh() === hitMesh);

            if (hitPlanet) {
                this.hoverPlanet(hitPlanet, event.clientX, event.clientY);
                this.renderer.domElement.style.cursor = 'pointer';
                return;
            }
        }

        this.unhoverPlanet();
        this.renderer.domElement.style.cursor = 'default';
    }

    onMouseLeave() {
        this.unhoverPlanet();
        this.renderer.domElement.style.cursor = 'default';
        this.hideTooltip();
    }

    onClick(event) {
        if (this.isAnimatingToPlanet) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = this.planets
            .map(planet => planet.getMesh())
            .filter(mesh => mesh !== null);

        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitPlanet = this.planets.find(p => p.getMesh() === hitMesh);

            if (hitPlanet) {
                this.selectPlanet(hitPlanet, this.currentControls);
                return;
            }
        }
    }

    hoverPlanet(planet, x, y) {
        if (planet.instantStop)
        {
            if (this.hoveredPlanet)
            {
                this.hoveredPlanet.onHoverEnd();
            }
            return;
        }

        if (this.hoveredPlanet !== planet) {
            // Убираем подсветку с предыдущей планеты
            if (this.hoveredPlanet) {
                this.hoveredPlanet.onHoverEnd();
            }
            
            // Подсвечиваем новую планету
            this.hoveredPlanet = planet;
            planet.onHoverStart();
        }

        this.showTooltip(planet, x, y);
    }

    unhoverPlanet() {
        if (this.hoveredPlanet) {
            this.hoveredPlanet.onHoverEnd();
            this.hoveredPlanet = null;
            this.hideTooltip();
        }
    }

    selectPlanet(planet, controls) {
        // Если уже выбрана эта планета - ничего не делаем
        if (this.selectedPlanet === planet) return;

        // Снимаем выделение с предыдущей
        if (this.selectedPlanet) {
            this.selectedPlanet.onHoverEnd();
            this.selectedPlanet.isSlowed = false;
            this.selectedPlanet.instantStop = false;
        }

        this.selectedPlanet = planet;
        planet.onHoverStart();
        planet.isSlowed = true;

        // Останавливаем орбитальное движение
        planet.instantStop = true;
    
        // Показываем информационную панель
        this.showInfoPanel(planet);

        // Анимируем камеру к планете
        this.animateCameraToPlanet(planet, controls);

        // Скрываем тултип
        this.hideTooltip();
    }

    animateCameraToPlanet(planet, controls) {
        const planetPos = planet.getPosition();
        
        // Сохраняем начальные позиции (текущие)
        this.startCameraPos.copy(this.camera.position);
        console.log('Start camera position:', this.camera.position);
        
        // Сохраняем текущий target из controls
        if (controls) {
            this.startTarget.copy(controls.target);
            console.log('Start target:', controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }

        // Вычисляем позицию для камеры (сбоку-сверху от планеты)
        const distance = planet.radius * 4 + 100;
        const angle = this.camera.position.angleTo(new THREE.Vector3(0, 0, 1));
        
        // Позиционируем камеру напротив планеты
        this.targetCameraPos.set(
            planetPos.x + distance * 0.7,
            planetPos.y + distance * 0.5,
            planetPos.z + distance * 0.7
        );
        this.targetTarget.copy(planetPos);

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    showInfoPanel(planet) {
        // Тестовое HTML-содержимое с полным описанием
        this.infoPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #88ccff; font-size: 24px;">🪐 ${planet.name}</h2>
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
            <div style="color: #ddd; line-height: 1.8; font-size: 15px;">
                <p style="margin: 0 0 12px 0;">${planet.getDescription()}</p>
                <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
                    <div><span style="color: #888;">Distance:</span> <span style="color: #aaf;">${planet.distance.toFixed(0)} units</span></div>
                    <div><span style="color: #888;">Radius:</span> <span style="color: #aaf;">${planet.radius.toFixed(0)} units</span></div>
                    <div><span style="color: #888;">Orbit Speed:</span> <span style="color: #aaf;">${(planet.orbitSpeed * 1000).toFixed(2)}×10⁻³</span></div>
                    <div><span style="color: #888;">Rotation Speed:</span> <span style="color: #aaf;">${(planet.rotationSpeed * 1000).toFixed(2)}×10⁻³</span></div>
                    <div><span style="color: #888;">Color:</span> <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: #${planet.color.toString(16).padStart(6, '0')}; vertical-align: middle;"></span></div>
                    <div><span style="color: #888;">Atmosphere:</span> <span style="color: #aaf;">${planet.hasAtmosphere ? '✅ Yes' : '❌ No'}</span></div>
                </div>
                <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
                <div style="font-size: 13px; color: #888; line-height: 1.6;">
                    <p style="margin: 0;"><strong>Order from Sun:</strong> ${planet.constructor.order || 'N/A'}</p>
                    <p style="margin: 4px 0 0 0;"><strong>Status:</strong> ${planet.isSlowed ? '🔄 Orbiting paused' : '🔄 Orbiting'}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">Click outside or press ESC to close</p>
                </div>
            </div>
        `;

        // Добавляем обработчик для кнопки закрытия
        const closeBtn = this.infoPanel.querySelector('#closeInfoBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeInfoPanel();
            });
        }

        this.infoPanel.style.display = 'block';
        this.infoPanel.style.opacity = '1';
        this.infoPanel.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    closeInfoPanel(controls) {
        if (!this.selectedPlanet) return;

        // Возвращаем нормальную скорость планете
        this.selectedPlanet.isSlowed = false;
        this.selectedPlanet.instantStop = false;
        this.selectedPlanet.onHoverEnd();
        this.selectedPlanet = null;

        // Скрываем панель
        this.infoPanel.style.display = 'none';

        // Возвращаем камеру в исходное положение
        this.resetCameraPosition(controls);
    }

    resetCameraPosition(controls) {
        // Сохраняем текущую позицию камеры как начальную для анимации
        this.startCameraPos.copy(this.camera.position);
        console.log('Start camera position:', this.camera.position);
        
        // Сохраняем текущий target из controls
        if (controls) {
            this.startTarget.copy(controls.target);
            console.log('Start target:', controls.target);
        } else {
            this.startTarget.set(0, 0, 0);
        }
        
        // Целевая позиция - исходное положение камеры
        this.targetCameraPos.set(3000, 600, 2000);
        this.targetTarget.set(0, 0, 0);

        this.isAnimatingToPlanet = true;
        this.animationProgress = 0;
    }

    showTooltip(planet, x, y) {
        // Позиционируем тултип рядом с курсором
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

        // Используем HTML для форматирования
        this.tooltip.innerHTML = `
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 6px; color: #88ccff;">
                🪐 ${planet.name}
            </div>
            <div style="font-size: 13px; line-height: 1.5; color: #ddd;">
                ${planet.getDescription()}
            </div>
            <div style="margin-top: 6px; font-size: 11px; color: #888;">
                Distance: ${planet.distance.toFixed(0)} units
            </div>
        `;
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
        this.tooltip.style.opacity = '0';
    }

    onResize() {
        if (this.labelRenderer) {
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    update(controls) {
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
            
            if (controls) {
                controls.target.lerpVectors(this.startTarget, this.targetTarget, t);
                controls.update();
            }
        }

        // Обновляем CSS2D рендерер
        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    dispose() {
        if (this.labelRenderer) {
            this.labelRenderer.dispose();
            document.body.removeChild(this.labelRenderer.domElement);
        }
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
        }
        if (this.infoPanel) {
            document.body.removeChild(this.infoPanel);
        }
    }
}
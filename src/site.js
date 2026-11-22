/**
 * Статические страницы портфолио: карусель фотографий и просмотр снимка на весь экран.
 * Никаких зависимостей — страницы должны работать как обычный HTML.
 */
(function () {
    'use strict';

    function openLightbox(src, alt) {
        let box = document.querySelector('.lightbox');

        if (!box) {
            box = document.createElement('div');
            box.className = 'lightbox';
            box.innerHTML = '<img alt="">';
            box.addEventListener('click', () => box.classList.remove('is-open'));
            document.body.appendChild(box);

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    box.classList.remove('is-open');
                }
            });
        }

        const image = box.querySelector('img');
        image.src = src;
        image.alt = alt || '';
        box.classList.add('is-open');
    }

    document.querySelectorAll('img[data-asset], .portfolio-details .shot img, .photo-slider__slide img')
        .forEach((img) => {
            img.addEventListener('click', () => {
                if (img.dataset.suppressZoom === '1') {
                    return;
                }

                openLightbox(img.currentSrc || img.src, img.alt);
            });
        });

    document.querySelectorAll('[data-gallery]').forEach((gallery) => {
        const track = gallery.querySelector('.photo-slider__track');
        const slides = Array.from(gallery.querySelectorAll('.photo-slider__slide'));
        const dots = Array.from(gallery.querySelectorAll('.photo-slider__dot'));
        const prevButton = gallery.querySelector('.photo-slider__nav--prev');
        const nextButton = gallery.querySelector('.photo-slider__nav--next');

        if (!track || slides.length < 2) {
            return;
        }

        gallery.querySelectorAll('img').forEach((img) => {
            img.draggable = false;
        });

        let index = 0;

        const render = () => {
            track.style.transform = 'translateX(-' + index * 100 + '%)';
            dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
            slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
        };

        const go = (step) => {
            index = (index + step + slides.length) % slides.length;
            render();
        };

        if (prevButton) {
            prevButton.addEventListener('click', () => go(-1));
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => go(1));
        }

        dots.forEach((dot, i) => dot.addEventListener('click', () => {
            index = i;
            render();
        }));

        let startX = 0;
        let startY = 0;
        let dragging = false;

        track.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            startX = event.clientX;
            startY = event.clientY;
            dragging = true;
        });

        track.addEventListener('pointerup', (event) => {
            if (!dragging) {
                return;
            }

            dragging = false;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (Math.abs(dx) <= 40 || Math.abs(dx) <= Math.abs(dy)) {
                return;
            }

            go(dx < 0 ? 1 : -1);

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
    });
}());

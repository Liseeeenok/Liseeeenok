#!/usr/bin/env node
/**
 * Собирает статическую часть портфолио: главную страницу профиля и страницы проектов.
 *
 * Запускается после `vite build`, когда в dist уже лежат ассеты, контент и текстуры:
 * собранный index.html (это 3D-сцена) переезжает в dist/3d/, а на его место кладётся
 * обычная HTML-страница профиля. Тексты берутся из public/content/{ru,en}/<ключ>/.
 *
 * Пути внутри страниц — относительные, поэтому одинаково работают и на /me/, и на
 * github.io/Liseeeenok/ (ровно так же, как контент в 3D-панели).
 */
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'public', 'content');

const SITE_TITLE = {
    ru: 'Ведерников Владислав Сергеевич',
    en: 'Vladislav Vedernikov',
};

// Короткий вариант для узкого экрана: полное имя в шапке не влезает.
const SITE_TITLE_SHORT = {
    ru: 'Ведерников В. С.',
    en: 'V. Vedernikov',
};

const NAV = {
    ru: { projects: 'Проекты', scene: '3D-сцена', other: 'EN' },
    en: { projects: 'Projects', scene: '3D scene', other: 'RU' },
};

const UI = {
    ru: {
        back: '← Все проекты',
        sceneLead: 'Интерактивная 3D-сцена: планеты — проекты, Солнце — профиль.',
        openScene: 'Открыть 3D-сцену',
        footer: 'Иркутск',
        about: 'Обо мне',
    },
    en: {
        back: '← All projects',
        sceneLead: 'An interactive 3D scene: planets are projects, the Sun is the profile.',
        openScene: 'Open the 3D scene',
        footer: 'Irkutsk',
        about: 'About me',
    },
};

const esc = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function exists(target) {
    try {
        await stat(target);
        return true;
    } catch {
        return false;
    }
}

async function readProjectKeys() {
    const about = await readFile(path.join(CONTENT, 'ru', 'about-me', 'details.html'), 'utf8');
    const order = [...about.matchAll(/data-project-target="([^"]+)"/g)].map((match) => match[1]);

    const dirs = (await readdir(path.join(CONTENT, 'ru'), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name !== 'about-me')
        .map((entry) => entry.name);

    return [...new Set([...order, ...dirs])];
}

function rewriteMarkup(html, base, lang) {
    return html
        // Картинки: data-asset → обычный src с относительным путём.
        .replace(/data-asset="([^"]+)"/g, (_, asset) => `src="${base}${asset}"`)
        // Ссылки на проекты: вместо обработчика 3D — адрес статической страницы.
        .replace(/<a([^>]*?)href="#"[^>]*?data-project-target="([^"]+)"([^>]*)>/g,
            (_, before, key, after) => `<a${before}href="${base}projects/${key}/"${after.replace(/\sdata-project-target="[^"]+"/, '')}>`)
        .replace(/\sdata-project-target="[^"]+"/g, '');
}

function pageShell({ lang, title, description, base, content, langHref }) {
    const nav = NAV[lang];
    const ui = UI[lang];
    const otherLang = lang === 'ru' ? 'en' : 'ru';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%23f59e0b'/><circle cx='16' cy='16' r='6' fill='%23020617'/></svg>">
<link rel="stylesheet" href="${base}site.css">
</head>
<body>
<header class="site-header">
    <a class="brand" href="${base}">
        <span class="brand-full">${esc(SITE_TITLE[lang])}</span>
        <span class="brand-short">${esc(SITE_TITLE_SHORT[lang])}</span>
    </a>
    <nav class="site-nav">
        <a href="${base}#projects">${esc(nav.projects)}</a>
        <a class="nav-scene" href="${base}3d/">${esc(nav.scene)}</a>
        <a class="nav-lang" href="${langHref}" hreflang="${otherLang}">${esc(nav.other)}</a>
    </nav>
</header>
<main class="site-main">
${content}
</main>
<footer class="site-footer">
    <span>${esc(ui.footer)} · ${new Date().getFullYear()}</span>
    <a href="${base}3d/">${esc(ui.openScene)} →</a>
</footer>
<script src="${base}site.js" defer></script>
</body>
</html>
`;
}

function sceneBlock(lang, base) {
    const ui = UI[lang];
    const nav = NAV[lang];
    return `<section class="scene-teaser">
    <div class="scene-teaser__text">
        <h2>${esc(nav.scene)}</h2>
        <p>${esc(ui.sceneLead)}</p>
        <a class="scene-teaser__btn" href="${base}3d/">${esc(ui.openScene)}</a>
    </div>
</section>`;
}

async function buildProject(lang, key, base, extraBase) {
    const dir = path.join(CONTENT, lang, key);
    const details = await readFile(path.join(dir, 'details.html'), 'utf8');
    const label = await readFile(path.join(dir, 'label.html'), 'utf8');

    const title = stripTags((details.match(/<h2>([\s\S]*?)<\/h2>/) || [, key])[1]);
    const summary = stripTags((label.match(/<p>([\s\S]*?)<\/p>/) || [, title])[1]);

    const content = `${rewriteMarkup(details, base, lang)}
<p class="back-link"><a href="${base}#projects">${esc(UI[lang].back)}</a></p>`;

    const html = pageShell({
        lang,
        title: `${title} — ${SITE_TITLE[lang]}`,
        description: summary,
        base,
        content,
        langHref: lang === 'ru' ? `${base}en/projects/${key}/` : `${base}projects/${key}/`,
    });

    const out = path.join(DIST, extraBase, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
    return { key, title, summary };
}

async function buildProfile(lang, base, extraBase) {
    const details = await readFile(path.join(CONTENT, lang, 'about-me', 'details.html'), 'utf8');
    const label = await readFile(path.join(CONTENT, lang, 'about-me', 'label.html'), 'utf8');
    const summary = stripTags((label.match(/<p>([\s\S]*?)<\/p>/) || [, SITE_TITLE[lang]])[1]);

    const withAnchor = details.replace(
        /<div class="section-title">(Проекты|Projects)<\/div>/,
        '<div class="section-title" id="projects">$1</div>'
    );

    const content = `${rewriteMarkup(withAnchor, base, lang)}
${sceneBlock(lang, base)}`;

    const html = pageShell({
        lang,
        title: `${SITE_TITLE[lang]} — ${lang === 'ru' ? 'портфолио' : 'portfolio'}`,
        description: summary,
        base,
        content,
        langHref: lang === 'ru' ? `${base}en/` : `${base}`,
    });

    const out = path.join(DIST, extraBase, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
}

async function main() {
    const sceneIndex = path.join(DIST, 'index.html');
    const sceneDir = path.join(DIST, '3d');

    if (!(await exists(sceneIndex))) {
        throw new Error('dist/index.html не найден — сначала запусти `vite build`');
    }

    // Собранное приложение — это 3D-сцена, оно уезжает на /3d/.
    await mkdir(sceneDir, { recursive: true });
    await rename(sceneIndex, path.join(sceneDir, 'index.html'));

    // Стили и скрипт статической части.
    await copyFile(path.join(ROOT, 'src', 'site.css'), path.join(DIST, 'site.css'));
    await copyFile(path.join(ROOT, 'src', 'site.js'), path.join(DIST, 'site.js'));

    const keys = await readProjectKeys();
    const built = { ru: [], en: [] };

    for (const lang of ['ru', 'en']) {
        await buildProfile(lang, lang === 'ru' ? './' : '../', lang === 'ru' ? '' : 'en');

        for (const key of keys) {
            const base = lang === 'ru' ? '../../' : '../../../';
            const extraBase = lang === 'ru' ? path.join('projects', key) : path.join('en', 'projects', key);
            const info = await buildProject(lang, key, base, extraBase);
            built[lang].push(info);
        }
    }

    // Карта сайта для поисковиков — простая и честная.
    const urls = ['', '3d/', 'en/'];
    for (const key of keys) {
        urls.push(`projects/${key}/`, `en/projects/${key}/`);
    }

    console.log(`статических страниц: ${2 + keys.length * 2} (проектов: ${keys.length})`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

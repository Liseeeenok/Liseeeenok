#!/usr/bin/env node
/**
 * Собирает статическую часть портфолио: главную страницу профиля, страницы проектов,
 * карту сайта, robots.txt и страницу 404.
 *
 * Запускается после `vite build`, когда в dist уже лежат ассеты, контент и текстуры:
 * собранный index.html (это 3D-сцена) переезжает в dist/3d/, а на его место кладётся
 * обычная HTML-страница профиля. Тексты берутся из public/content/{ru,en}/<ключ>/.
 *
 * Пути внутри страниц — относительные, поэтому одинаково работают и на /me/, и на
 * github.io/Liseeeenok/. Абсолютный адрес сайта для og-тегов, sitemap и robots
 * берётся из переменной окружения SITE_URL (по умолчанию — легион).
 */
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'public', 'content');

const SITE_URL = (process.env.SITE_URL || 'https://90.188.226.68/me').replace(/\/+$/, '');

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
        city: 'Иркутск',
        updated: 'Обновлено',
        notFound: 'Страница не найдена',
        notFoundText: 'Такой страницы нет. Возможно, ссылка устарела.',
        toHome: '← На главную',
    },
    en: {
        back: '← All projects',
        sceneLead: 'An interactive 3D scene: planets are projects, the Sun is the profile.',
        openScene: 'Open the 3D scene',
        city: 'Irkutsk',
        updated: 'Updated',
        notFound: 'Page not found',
        notFoundText: 'This page does not exist. The link may be outdated.',
        toHome: '← Home',
    },
};

const MONTHS = {
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
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

/** Самая свежая дата среди текстов контента — её и показываем как «обновлено». */
async function contentUpdatedAt() {
    let newest = new Date(0);

    for (const lang of ['ru', 'en']) {
        const base = path.join(CONTENT, lang);

        for (const entry of await readdir(base, { withFileTypes: true })) {
            if (!entry.isDirectory()) {
                continue;
            }

            for (const file of ['details.html', 'label.html']) {
                const target = path.join(base, entry.name, file);

                if (await exists(target)) {
                    const info = await stat(target);

                    if (info.mtime > newest) {
                        newest = info.mtime;
                    }
                }
            }
        }
    }

    return newest;
}

const formatDate = (date, lang) => `${date.getDate()} ${MONTHS[lang][date.getMonth()]} ${date.getFullYear()}`;

function rewriteMarkup(html, base) {
    return html
        // Картинки: data-asset → обычный src с относительным путём.
        .replace(/data-asset="([^"]+)"/g, (_, asset) => `src="${base}${asset}"`)
        // Ссылки на проекты: вместо обработчика 3D — адрес статической страницы.
        .replace(/<a([^>]*?)href="#"[^>]*?data-project-target="([^"]+)"([^>]*)>/g,
            (_, before, key, after) => `<a${before}href="${base}projects/${key}/"${after.replace(/\sdata-project-target="[^"]+"/, '')}>`)
        .replace(/\sdata-project-target="[^"]+"/g, '');
}

function pageShell({ lang, title, description, base, content, langHref, urlPath, updatedAt, ogType = 'website' }) {
    const nav = NAV[lang];
    const ui = UI[lang];
    const otherLang = lang === 'ru' ? 'en' : 'ru';
    const canonical = `${SITE_URL}/${urlPath}`;
    const ogImage = `${SITE_URL}/content/og/og-${lang}.jpg`;
    const updated = formatDate(updatedAt, lang);

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE_TITLE[lang])}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang === 'ru' ? 'ru_RU' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
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
    <span>${esc(ui.city)} · ${esc(ui.updated)} ${esc(updated)}</span>
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

async function buildProject(lang, key, base, urlPath, updatedAt) {
    const dir = path.join(CONTENT, lang, key);
    const details = await readFile(path.join(dir, 'details.html'), 'utf8');
    const label = await readFile(path.join(dir, 'label.html'), 'utf8');

    const title = stripTags((details.match(/<h2>([\s\S]*?)<\/h2>/) || [, key])[1]);
    const summary = stripTags((label.match(/<p>([\s\S]*?)<\/p>/) || [, title])[1]);

    const content = `${rewriteMarkup(details, base)}
<p class="back-link"><a href="${base}#projects">${esc(UI[lang].back)}</a></p>`;

    const html = pageShell({
        lang,
        title: `${title} — ${SITE_TITLE[lang]}`,
        description: summary,
        base,
        content,
        urlPath,
        updatedAt,
        langHref: lang === 'ru' ? `${base}en/projects/${key}/` : `${base}projects/${key}/`,
    });

    const out = path.join(DIST, urlPath, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
    return { key, title, summary };
}

async function buildProfile(lang, base, urlPath, updatedAt) {
    const details = await readFile(path.join(CONTENT, lang, 'about-me', 'details.html'), 'utf8');
    const label = await readFile(path.join(CONTENT, lang, 'about-me', 'label.html'), 'utf8');
    const summary = stripTags((label.match(/<p>([\s\S]*?)<\/p>/) || [, SITE_TITLE[lang]])[1]);

    const withAnchor = details.replace(
        /<div class="section-title">(Проекты|Projects)<\/div>/,
        '<div class="section-title" id="projects">$1</div>'
    );

    const content = `${rewriteMarkup(withAnchor, base)}
${sceneBlock(lang, base)}`;

    const html = pageShell({
        lang,
        title: `${SITE_TITLE[lang]} — ${lang === 'ru' ? 'портфолио' : 'portfolio'}`,
        description: summary,
        base,
        content,
        urlPath,
        updatedAt,
        ogType: 'profile',
        langHref: lang === 'ru' ? `${base}en/` : `${base}`,
    });

    const out = path.join(DIST, urlPath, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
}

async function writeServiceFiles(pages, updatedAt) {
    const lastmod = updatedAt.toISOString().slice(0, 10);

    const urls = pages.map(({ urlPath, priority }) => `  <url>
    <loc>${SITE_URL}/${urlPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`).join('\n');

    await writeFile(path.join(DIST, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

    await writeFile(path.join(DIST, 'robots.txt'),
        `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);

    // 404: на GitHub Pages файл берётся из корня, на легионе — через error_page nginx.
    const homeScript = "(function(){var p=location.pathname;var home=p.indexOf('/Liseeeenok/')===0?'/Liseeeenok/':(p.indexOf('/me/')===0?'/me/':'/');var a=document.querySelector('a.home');if(a){a.href=home;}})();";

    await writeFile(path.join(DIST, '404.html'), `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(UI.ru.notFound)}</title>
<meta name="robots" content="noindex">
<style>
  html, body { margin: 0; min-height: 100%; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(900px 500px at 20% 0%, rgba(56,189,248,.16), transparent 60%), #05080f;
    color: #e6edf7; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    text-align: center; padding: 24px;
  }
  h1 { font-size: clamp(28px, 6vw, 44px); margin: 0 0 10px; letter-spacing: -.02em; }
  p { margin: 0 0 22px; color: #96a3b8; }
  a { color: #7dd3fc; text-decoration: none; border-bottom: 1px solid rgba(125,211,252,.4); }
  .code { color: #7dd3fc; font-size: 14px; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 14px; }
</style>
</head>
<body>
  <main>
    <div class="code">404</div>
    <h1>${esc(UI.ru.notFound)}</h1>
    <p>${esc(UI.ru.notFoundText)}</p>
    <a class="home" href="/">${esc(UI.ru.toHome)}</a>
  </main>
  <script>${homeScript}</script>
</body>
</html>
`);
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
    const updatedAt = await contentUpdatedAt();

    const pages = [
        { urlPath: '', priority: '1.0' },
        { urlPath: '3d/', priority: '0.8' },
        { urlPath: 'en/', priority: '0.9' },
    ];

    await buildProfile('ru', './', '', updatedAt);
    await buildProfile('en', '../', 'en/', updatedAt);

    for (const key of keys) {
        await buildProject('ru', key, '../../', `projects/${key}/`, updatedAt);
        await buildProject('en', key, '../../../', `en/projects/${key}/`, updatedAt);
        pages.push({ urlPath: `projects/${key}/`, priority: '0.7' });
        pages.push({ urlPath: `en/projects/${key}/`, priority: '0.6' });
    }

    await writeServiceFiles(pages, updatedAt);

    console.log(`статических страниц: ${2 + keys.length * 2} (проектов: ${keys.length}); sitemap, robots и 404 готовы`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

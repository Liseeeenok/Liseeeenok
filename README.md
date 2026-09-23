# Liseeeenok — интерактивное портфолио

Личный сайт-портфолио в виде 3D-солнечной системы: **Солнце** — раздел «Обо мне», **планеты** — проекты из моего опыта.

🌐 **Демо:** [liseeeenok.github.io/Liseeeenok](https://liseeeenok.github.io/Liseeeenok/)

## О проекте

Интерактивная 3D-сцена на **Three.js**, где можно:

- вращать камеру и приближаться к объектам;
- наводить курсор на планеты, чтобы увидеть краткое описание;
- кликать по проектам и читать подробности;
- переключать язык **RU / EN**.

Проекты включают интеграции с Bitrix24, CRM-решения, ботов, карты, личные кабинеты и другие кейсы.

## Стек

- [Three.js](https://threejs.org/) — WebGL-сцена
- [Vite](https://vitejs.dev/) — сборка и dev-сервер
- Vanilla JavaScript (без фреймворков)

## Локальный запуск

```bash
npm install
npm run dev
```

Сайт откроется на `http://localhost:3000`.

Сборка для production:

```bash
npm run build
npm run preview
```

Проверка сборки так же, как на GitHub Pages:

```bash
npm run preview:pages
```

## Редактирование контента

Тексты проектов лежат в `public/content/`:

```
public/content/
├── ru/
│   └── <project-key>/
│       ├── label.html    # краткое описание (tooltip)
│       └── details.html  # полное описание (панель)
└── en/
    └── ...
```

Настройки планет (название, орбита, текстура, цвет) — в `src/data/projectPlanets.js`.

## Деплой

Сайт автоматически публикуется на **GitHub Pages** при push в ветку `main` через GitHub Actions (`.github/workflows/deploy.yml`).

## Автор

**Liseeeenok** — разработчик, портфолио проектов и кейсов.

# Арена переговоров

Telegram Mini App: текстовый тренажёр переговоров. Пользователь выбирает сценарий, задаёт цель и границы условий, ведёт диалог с ИИ-собеседником и получает разбор после завершения. Пока бэкенд не подключён, клиент работает на встроенном моке с тем же контрактом, что и HTTP-клиент.

Визуальный бренд на главном экране — «Вершина»: переговоры поданы как восхождение.

## Стек

| | |
|---|---|
| UI | Vue 3, Composition API, `<script setup>` |
| Состояние | Pinia |
| Маршруты | Vue Router, `createWebHashHistory` |
| Сборка | Vite 7, TypeScript (strict), `vue-tsc` |
| Линтер | oxlint |
| Пакеты | pnpm 11 |
| Шрифт | Inter (Google Fonts) |
| Оболочка | Telegram Web App (`telegram-web-app.js`) |

Бэкенда в репозитории нет. Слой `Api` один: экраны не знают, мок это или HTTP.

## Запуск

```bash
pnpm i
pnpm dev
```

Откройте адрес из вывода Vite (обычно `http://localhost:5173`). Если порт занят, Vite возьмёт следующий. Сервер слушает `host: true`, поэтому доступен и по адресу в локальной сети.

В Telegram Mini App укажите этот адрес как URL веб-приложения. Маршруты hash-based (`/#/scenarios`), базовый путь сборки — `/ai-alabuga/`.

```bash
pnpm lint
pnpm build
pnpm preview
```

`build` сначала проверяет типы (`vue-tsc --noEmit`), затем собирает `dist`. Публикация на GitHub Pages:

```bash
pnpm deploy
```

Скрипт `predeploy` сам запускает сборку. Каталог `dist` отдаётся через `gh-pages`.


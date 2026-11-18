# Game Framework

Игровой фреймворк для OpenCode: 52 агента, 86 скиллов, 16 правил, 29 шаблонов
документов. Phaser 4 — основной стек, Unity 6.3 LTS — второй.

## Что это

Модульная «студия в папке». В репозитории лежит библиотека всех инструментов, но
в проект устанавливается только нужное. Неустановленный модуль физически
отсутствует, поэтому не тратит контекст.

```text
.framework/          библиотека (агент её не видит)
  library/           52 агента, 86 скиллов, 86 команд, 16 правил
  modules/           27 манифестов
  install.mjs        установщик
.opencode/           активное: только установленные модули
docs/agents/         конфигурация проекта, по одному файлу на тему
docs/framework/      справочники и шаблоны документов
design/              GDD и реестр сущностей
src/                 код игры
production/          PIPELINE.md, SCOPE.md, спринты
```

## Быстрый старт

```bash
npm install
opencode
```

В сессии: `/start` — онбординг, `/` — список команд.

## Модули

```bash
node .framework/install.mjs list                 # все модули и статус
node .framework/install.mjs add engine-phaser    # поставить движок
node .framework/install.mjs remove art           # убрать, правки сохранятся
node .framework/install.mjs capture art          # перенести правки в библиотеку
node .framework/install.mjs doctor               # проверить целостность
```

По умолчанию стоят пять модулей: `core`, `design`, `programming`, `qa`, `release`.
Движки, домены и процессы ставятся под проект. Если агенту нужна возможность из
неустановленного модуля, он обязан предложить команду и дождаться согласия.

## Инструменты

| Команда | Что делает |
|---|---|
| `node tools/pipeline.mjs status` | фаза, открытые гейты, предупреждение о перекосе |
| `node tools/scope.mjs` | контракт скоупа: сколько обещано и сколько есть |
| `node tools/learn.mjs list` | предложения из находок |
| `node tools/ab.mjs` / `reveal.mjs` | слепое сравнение кадров |
| `node tools/capture.mjs` | снимок экрана через headless Chrome |
| `node tools/envcheck.mjs` | чего не хватает в окружении |
| `node tools/change-model.mjs <model>` | сменить модель у агентов |
| `node tools/check-encoding.mjs` | проверить UTF-8 |

## Проверки

```bash
npm test              # кодировка, плагины, хуки, структура фреймворка
npm run modules:doctor
npm run agents:build  # пересобрать frontmatter агентов из agent-routing.json
```

## Документация

- `docs/WORKFLOW-GUIDE.md` — полный разбор фаз
- `docs/КАК-РАБОТАТЬ.md` — инструкция: с чего начать, что когда запускать
- `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` — как агент ведёт диалог
- `docs/examples/` — разобранные сессии
- `docs/FRAMEWORK-*.md` — аудит, план, сравнение, пробелы
- `docs/THIRD-PARTY.md` — что взято из внешних проектов

## Происхождение

Форк [OpenCode Game Studios](https://github.com/striderZA/OpenCodeGameStudios)
(MIT), который в свою очередь вырос из
[Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios).
Часть шаблонов и идей — из [opencode-game-studio](https://github.com/TraftG/opencode-game-studio)
и [studioigor-skill](https://github.com/studioigor/studioigor-skill), оба MIT.
Подробности — `docs/THIRD-PARTY.md`.

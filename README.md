# Game Framework

Игровой фреймворк для OpenCode: 52 агента, 90 скиллов, 19 правил, 38 шаблонов
документов. Phaser 4 — основной стек, Unity 6.3 LTS — второй.

## Что это

Модульная «студия в папке». В репозитории лежит библиотека всех инструментов, но
в проект устанавливается только нужное. Неустановленный модуль физически
отсутствует, поэтому не тратит контекст.

```text
.framework/          библиотека (агент её не видит)
  library/           52 агента, 90 скиллов, 90 команд, 19 правил
  modules/           31 манифест
  install.mjs        установщик
.opencode/           активное: только установленные модули
docs/agents/         конфигурация проекта, по одному файлу на тему
docs/framework/      справочники и шаблоны документов
design/              GDD и реестр сущностей
data/                таблицы, которые правит владелец (TSV)
src/                 код игры
production/          PIPELINE.md, SCOPE.md, спринты
```

## Быстрый старт

```bash
npm install
npm run check:slice   # typecheck + тесты + сборка: скелет работает
npm run dev           # http://localhost:5174
```

В сессии: `/start` — онбординг, `/` — список команд.

В репозитории уже лежит рабочий скелет: клик добавляет, время отнимает, полоска
на экране, сохранение в браузере. Это не демо игры — это каркас, в который
механики вставляются по одной. Замените механику, оставьте проводку.

Числа живут в `data/*.tsv` — их вы открываете в таблице. Из них
`npm run data:apply` собирает JSON, который импортирует игра; `npm run data:check`
падает, если таблица и JSON разошлись.

## Модули

```bash
node .framework/install.mjs list                 # все модули и статус
node .framework/install.mjs add engine-phaser    # поставить движок
node .framework/install.mjs remove art           # убрать, правки сохранятся
node .framework/install.mjs capture art          # перенести правки в библиотеку
node .framework/install.mjs doctor               # проверить целостность
```

По умолчанию стоят восемь модулей: `core`, `design`, `programming`, `qa`,
`release`, `obsidian`, `shutdown`, `comfyui`.
Движки, домены и процессы ставятся под проект. Если агенту нужна возможность из
неустановленного модуля, он ставит его сам и сразу отчитывается: что, зачем и
как откатить. Удаление — только с вашего разрешения.

## Инструменты

| Команда | Что делает |
|---|---|
| `node tools/pipeline.mjs status` | фаза, открытые гейты, предупреждение о перекосе |
| `node tools/table.mjs apply\|pull\|check` | таблицы `data/*.tsv` ⇄ JSON в `src/data/` |
| `node tools/systems-count.mjs` | сколько систем активно (потолок — 5) |
| `node tools/scope.mjs` | контракт скоупа: сколько обещано и сколько есть |
| `node tools/learn.mjs list` | предложения из находок |
| `node tools/ab.mjs` / `reveal.mjs` | слепое сравнение кадров |
| `node tools/capture.mjs` | снимок экрана через headless Chrome |
| `node tools/envcheck.mjs` | чего не хватает в окружении |
| `node tools/obsidian.mjs` | заметки в Obsidian: создать, найти, проверить ссылки |
| `node tools/change-model.mjs <model>` | сменить модель у агентов |
| `node tools/check-encoding.mjs` | проверить UTF-8 |

## Проверки

```bash
npm test                 # кодировка, плагины, хуки, структура фреймворка, синхронизация
npm run check:slice      # таблицы, типы, юнит-тесты, сборка проекта
npm run check:framework  # библиотека .framework и активная копия .opencode совпадают
npm run modules:doctor
npm run agents:build     # пересобрать frontmatter агентов из agent-routing.json
```

## Обновление живого проекта

Шаблон продолжает жить, пока живёт проект. Фиксы шаблона доезжают до проекта
только через `.opencode/`, и это самое незаметное место: библиотека
`.framework/library/` уже содержит исправление, а загружается старая активная
копия. Ошибка при этом выглядит так, будто фикс не сработал.

Порядок:

1. `npm run check:framework` — показывает файлы, где библиотека и активная
   копия разошлись, и файлы, которые есть в библиотеке, но не загружены.
2. Библиотека права (пришёл фикс шаблона) —
   `node .framework/install.mjs add <модуль> --force`.
3. Активная копия права (вы или агент правили файл фреймворка руками) —
   `node .framework/install.mjs capture <модуль>`: правка уезжает в библиотеку,
   а не теряется при следующем обновлении.
4. Не понятно, кто прав — `git log --oneline -- .framework/library/<файл>`.

`npm run check:framework` входит в `npm test`, поэтому расхождение ловится до
коммита, а не через неделю.

## Документация

- `docs/WORKFLOW-GUIDE.md` — полный разбор фаз
- `docs/КАК-РАБОТАТЬ.md` — инструкция: с чего начать, что когда запускать
- `docs/КАК-ПОДКЛЮЧИТЬ.md` — новый проект, существующий проект, перенос на другой движок
- `docs/ru/` — русские копии полного руководства и принципа совместной работы
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

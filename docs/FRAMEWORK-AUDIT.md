# Framework Audit — GameTemplate

> **Исторический документ.** Описывает состояние на момент составления (2026-11-18, до внедрения). Актуальная структура — `docs/agents/` и `AGENTS.md`.


> Аудит исходного OCGS v0.14.1 для построения собственного фреймворка.
> Составлен по фактам проекта Numtris, а не по предположениям.

## Итоговое решение (2026-11-18)

Категории ниже — **исходная классификация**, а не приговор. По решению от
2026-11-18 ничего не удаляется: категория A переведена в **опциональные
модули**. Разница принципиальная: удалённое нельзя вернуть, а неустановленный
модуль стоит ноль токенов и ставится одной командой.

| Было в аудите | Стало в фреймворке |
|---|---|
| A. Удалить | Опциональные модули (`engine-*`, `art`, `audio`, `narrative`, `level-design`, `live-ops`, `stories`, `team-orchestration`, `qa-advanced`, `release-launch`) |
| B. Оставить | Опциональные модули (`architecture`, `ui`, `localization`, `prototyping`, `data`, `analytics`) |
| C. Оставить обязательно | Установлены по умолчанию (`core`, `design`, `programming`, `qa`, `release`) |
| D. Создать | `engine-phaser` создан; остальные пробелы — следующий этап |

Реализация: `docs/FRAMEWORK-PLAN.md`.

## Метод

Источники доказательств:

| Источник | Что даёт |
|---|---|
| `Numtris/.opencode/modules/installed.json` | какие модули реально ставились (5 из 22) |
| `Numtris/.agents/{agents,skills,commands,rules}` | 18/50/37/6 — уже подрезанный набор |
| `Numtris/design/gdd/*` (23 файла) | доказательство использования дизайн-воркфлоу |
| `Numtris/design/balance/*` (16 отчётов) | balance-check использовался интенсивно |
| `Numtris/docs/architecture/*` (24 ADR + control-manifest + tr-registry) | architecture-decision / create-architecture / create-control-manifest |
| `Numtris/production/*` | sprint-plan, project-stage-detect, session-state |
| `Numtris/src`, `Numtris/tests` (36 сьютов, 311 тестов) | test-setup / test-helpers |
| `Numtris/production/session-logs/agent-audit.log` | skill-test запускался |
| `~/.config/opencode/skills/phaser-coder` | единственный собственный скилл |
| `Numtris/AGENTS.md` (18 КБ) | кастомизированный конфиг под Phaser |

Уровни уверенности: **сильная** — есть артефакт; **средняя** — артефакт косвенный;
**слабая** — следов нет, но вытекает из природы проекта.

---

## A. Не использовали и вряд ли понадобится — удалить

### Движки, кроме Phaser (18 агентов)

| Инструмент | Тип | Зачем был нужен | Уверенность |
|---|---|---|---|
| `engine-godot` (5 агентов) | модуль | Godot 4: GDScript, C#, шейдеры, GDExtension | сильная — стек Phaser |
| `engine-unity` (5 агентов) | модуль | Unity: DOTS, шейдеры, Addressables, UI | сильная |
| `engine-unreal` (5 агентов) | модуль | UE5: Blueprint, GAS, репликация, UMG | сильная |
| `engine-sfml3` (1 агент) | модуль | SFML 3, C++ | сильная |
| `engine-raylib` (1 агент) | модуль | Raylib, C/C++ | сильная |
| `engine-bevy` (1 агент) | модуль | Bevy, Rust ECS | сильная |

### Производственные домены, которых нет в проекте

| Инструмент | Тип | Зачем был нужен | Уверенность |
|---|---|---|---|
| `art` (art-director, technical-artist + 4 скилла) | модуль | Aseprite MCP, арт-библия, генерация ассетов | сильная — графика рисуется кодом |
| `audio` (audio-director, sound-designer + team-audio) | модуль | аудио-дирекшн, саунд-дизайн | сильная — синтез WebAudio |
| `narrative` (narrative-director, world-builder, writer + team-narrative) | модуль | сюжет, лор, диалоги | сильная — сюжета нет |
| `level-design` (level-designer + team-level) | модуль | уровни, энкаунтеры | сильная — одна доска |
| `live-ops` (community-manager, live-ops-designer + team-live-ops) | модуль | сезоны, комьюнити | сильная — до релиза |
| `stories` (10 скиллов) | модуль | эпики, стори, dev-story, story-done | сильная — работали спринтами |

### Адаптеры чужих харнессов

| Инструмент | Тип | Зачем был нужен | Уверенность |
|---|---|---|---|
| `.claude/` | каталог | Claude Code | сильная — работаем в OpenCode |
| `.pi/` (9 расширений) | каталог | Pi | сильная |
| `.omp/` | каталог | oh-my-pi | сильная |
| `.cursor/` | каталог | Cursor | сильная |
| `.agents/modules/` (дубль) | каталог | второй источник модулей для не-OpenCode таргетов | сильная |

### QA-инструменты под другие условия

| Инструмент | Тип | Зачем был нужен | Уверенность |
|---|---|---|---|
| `soak-test` | скилл+команда | многочасовые сессии, утечки | средняя — 311 тестов закрывают |
| `autopilot-playtest` | скилл+команда | автоматический плейтест через Autopilot MCP | сильная — MCP выключен |
| `automated-smoke-test` | скилл+команда | запуск проекта через godot-mcp | сильная — Godot MCP выключен |
| `test-flakiness` | скилл+команда | анализ нестабильных тестов по CI-логам | слабая |
| `bug-triage` | скилл+команда | разбор бэклога багов | сильная — нет `production/qa/bugs/` |
| `team-qa` | скилл+команда | оркестрация qa-lead + qa-tester | слабая — избыточна для соло |

### Release-инструменты под публичный запуск

| Инструмент | Тип | Зачем был нужен | Уверенность |
|---|---|---|---|
| `launch-checklist` | скилл+команда | запуск: стор, маркетинг, legal | слабая |
| `day-one-patch` | скилл+команда | патч первого дня | слабая |
| `hotfix` | скилл+команда | аварийный фикс с audit trail | слабая |
| `team-release` | скилл+команда | оркестрация релиз-команды | слабая |
| `patch-notes` | скилл+команда | патчноуты для игроков | слабая |
| `milestone-review` | скилл+команда | обзор вех | слабая |

---

## B. Не использовали, но может пригодиться — оставить

| Инструмент | Тип | Зачем | Почему может понадобиться |
|---|---|---|---|
| `architecture` (lead-programmer, architecture-review, create-control-manifest, propagate-design-change, rule design-docs) | модуль | контроль архитектуры, ADR-ревью, манифест | `control-manifest.md` и `tr-registry.yaml` уже созданы — навык пригодится при росте |
| `localization` (localization-lead + localize) | модуль | i18n, извлечение строк, RU/EN | `localization-plan.md` написан, `src/config/i18n.ts` есть, но скилл не ставили |
| `ui` (ux-designer, ui-programmer, accessibility-specialist + team-ui, ux-design, ux-review, rule ui-code) | модуль | UX, UI-код, доступность | 12 сцен, GDD `hud-menus`, `accessibility`, ADR-0008/0011 — работа велась вручную |
| `prototyping` (prototyper + explore, prototype, hybrid-prototype, rule prototype-code) | модуль | быстрые прототипы, выбор идеи | `prototypes/` пуст, но следующий проект начнётся с прототипа |
| `data` (rule data-files) | модуль | конвенции data-файлов | `src/config/*` — уже data-driven |
| `qa`: `qa-plan`, `smoke-check`, `regression-suite`, `test-evidence-review`, `perf-profile`, `security-audit`, `bug-report`, `skill-improve` | скиллы | тест-план, гейт, регресс, профилирование | тесты есть, формальных прогонов не было |
| `release`: `release-checklist`, `retrospective`, `sprint-status`, `changelog` | скиллы | релиз-гейт, ретро, статус, журнал | спринт-план использовался, остальное рядом |
| `design`: `content-audit`, `scope-check`, `estimate`, `playtest-report`, `team-combat` | скиллы | аудит контента, контроль скоупа, оценки | 24 системы — кандидаты на аудит |
| `architecture-decision`, `gate-check`, `help`, `start`, `init-template`, `setup-engine`, `project-stage-detect` | core-скиллы | базовый контур | использовались, остаются в ядре |
| `code-review`, `tech-debt`, `onboard`, `reverse-document`, `adopt` | скиллы (stories) | ревью кода, долги, онбординг, обратная документация | перенести в core или отдельный модуль |
| `changelog-generator` | плагин | автогенерация CHANGELOG | CHANGELOG.md в репозитории есть |
| `drift-detector` | плагин | валидация секций GDD при записи | audit.log полон его сообщений — работал |

---

## C. Были нужны в этом проекте — оставить обязательно

| Инструмент | Тип | Доказательство |
|---|---|---|
| `creative-director`, `producer`, `technical-director` | агенты | AGENTS.md, координация |
| `game-designer`, `systems-designer` | агенты | 23 GDD, systems-index |
| `gameplay-programmer`, `engine-programmer`, `tools-programmer` | агенты | 24 системы, `tools/*.mjs` |
| `qa-lead`, `qa-tester`, `performance-analyst` | агенты | 311 тестов, perf-бюджеты |
| `release-manager` | агент | `production/sprints/sprint-01.md` |
| `devops-engineer` | агент | `vite.config.ts`, сборки, `.github/` |
| `network-programmer` | агент | ADR-0009 offline-first leaderboard, `HttpLeaderboard.ts` |
| `ai-programmer` | агент | ADR-0019 bot play sandbox |
| `economy-designer` | агент | очки, комбо, множители, 70 ачивок |
| `concept-brainstorm` | скилл | `design/gdd/game-concept.md` |
| `map-systems` | скилл | `design/gdd/systems-index.md` |
| `design-system` | скилл | 23 GDD |
| `design-review` | скилл | GDD прошли ревью |
| `review-all-gdds` | скилл | `gdd-cross-review-2026-11-14.md` |
| `balance-check` | скилл | 16 отчётов в `design/balance/` |
| `quick-design` | скилл | точечные правки ADR-0016…0024 |
| `create-architecture` | скилл | `docs/architecture/architecture.md` |
| `architecture-decision` | скилл | 24 ADR |
| `create-control-manifest` | скилл | `docs/architecture/control-manifest.md` |
| `setup-engine` | скилл | AGENTS.md: Phaser 4.2.1 |
| `project-stage-detect` | скилл | `production/project-stage-report.md` |
| `init-template` | скилл | `installed.json` от 2026-11-14 |
| `test-setup` | скилл | 36 сьютов vitest |
| `test-helpers` | скилл | `tests/helpers.ts` |
| `skill-test` | скилл | `agent-audit.log`: `/skill-test static sprint-plan` |
| `sprint-plan` | скилл | `production/sprints/sprint-01.md` |
| `consistency-check` | скилл | `design/registry/entities.yaml` |
| `localize` | скилл | `production/localization-plan.md`, RU/EN |
| `ux-design` | скилл | `hud-menus.md`, `accessibility.md` |
| `code-review` | скилл | код-ревью в ходе разработки |
| `phaser-coder` (внешний) | скилл | `~/.config/opencode/skills/phaser-coder` |

---

## D. Были нужны, но не оказалось — создать

| Что | Почему отсутствие мешало | Откуда взять |
|---|---|---|
| **Phaser-специалист** | в OCGS нет `engine-phaser`; AGENTS.md прямо признаёт пробел и велит грузить `phaser-coder` | перенести `phaser-coder` (2 файла, 27 КБ) в фреймворк как `engine-phaser` |
| **Правило `phaser-code`** | нет path-scoped правил для `src/scenes/**`, `src/systems/**` | написать своё |
| **Скилл UI-проверки** | `tools/ui-inspector.mjs` (headless Chrome, RU/EN, 1.25/1.5, overlap-детект) — уникальный инструмент, живёт только в проекте | оформить как скилл `ui-check` |
| **Скилл аудио-проверки** | `npm run check:audio` — проверка 8 cue/100 мс, pitch clamp, mute | оформить как скилл `audio-check` |
| **Скилл баланс-прогонов** | `tools/balance-progress.mjs`, checkpoint/resume, affinity — уникально | оформить как `balance-run` |
| **Скилл кодировки** | `tools/check-encoding.mjs`, mojibake-детект | оформить как `encoding-check` |
| **Скилл сборки релиза** | `npm run build:release`, вырезание devtools, TestRunnerLoader stub | оформить как `release-build` |
| **Скилл i18n-синхронизации** | RU/EN таблицы + 1.25/1.5 масштаб текста | расширить `localize` |

---

## Сводка

| Категория | Позиций |
|---|---|
| A. Удалить | 6 модулей-движков (18 агентов), 6 доменных модулей (12 агентов, 22 скилла), 5 адаптеров, 12 QA/Release скиллов |
| B. Оставить | architecture, localization, ui, prototyping, data + ~20 скиллов + 2 плагина |
| C. Оставить обязательно | 14 агентов, 30 скиллов, 3 плагина, 5 правил |
| D. Создать | 1 агент (Phaser), 1 правило, 6 скиллов |

Целевой размер: ~15–17 агентов, ~35–40 скиллов, ~8 правил, 1 движковый модуль вместо 6.

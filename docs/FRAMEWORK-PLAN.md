# Framework Plan — GameTemplate

> **Исторический документ.** Описывает состояние на момент составления (2026-11-18, до внедрения). Актуальная структура — `docs/agents/` и `AGENTS.md`.


> Решения, принятые 2026-11-18. Основано на `docs/FRAMEWORK-AUDIT.md`.

## Принципы

1. **Ничего не удаляем.** Всё, что не нужно сейчас, становится опциональным модулем.
2. **Неустановленный модуль стоит 0 токенов.** Он лежит в библиотеке и не виден агенту.
3. **Минимум по умолчанию.** Новый проект стартует с 5 модулей, остальные 22 — по требованию.
4. **Агент предлагает модуль сам.** Обнаружил Phaser — предлагает `engine-phaser`. Появилась телеметрия — предлагает `analytics`.
5. **Рабочий язык — английский.** Русский только в инструкции для человека.

## Проблема текущей раскладки

```
.agents/agents      ← 52 агента (ВСЕ активны)
.opencode/agents    ← симлинк на .agents/agents
.opencode/modules/  ← копии тех же файлов по модулям
installed.json      ← только учёт, на загрузку не влияет
```

`installed.json` не управляет контекстом: OpenCode читает `.opencode/agents`, а там симлинк на полный `.agents/`. Плюс двойное хранение (52 файла в `.agents` + 52 в `modules/`).

## Целевая раскладка

```
library/                      ← ПУЛ. Всё, что есть. Не читается агентом.
  agents/  skills/  commands/  rules/
  modules/*.yaml              ← манифесты: что входит в модуль

.opencode/                    ← АКТИВНОЕ. Читается агентом.
  agents/  skills/  commands/  rules/
  modules/install.mjs
  modules/installed.json      ← источник истины

docs/                         ← документация фреймворка
```

`install.mjs add X` копирует файлы из `library/` в `.opencode/`.
`install.mjs remove X` удаляет их из `.opencode/`, в `library/` остаются.
Правки пользователя в `.opencode/` при `remove` сохраняются (как сейчас).

## Реестр модулей

### Устанавливаются по умолчанию (5)

| Модуль | Агенты | Скиллы | Правила | Триггер |
|---|---|---|---|---|
| `core` | creative-director, producer, technical-director | start, help, init-template, setup-engine, project-stage-detect, concept-brainstorm, map-systems, create-architecture, architecture-decision, gate-check + утилиты: code-review, tech-debt, onboard, reverse-document, adopt | — | всегда |
| `design` | game-designer, systems-designer, economy-designer | design-system, design-review, quick-design, review-all-gdds, balance-check, consistency-check, content-audit, scope-check, estimate, playtest-report | — | всегда |
| `programming` | gameplay-programmer, engine-programmer, ai-programmer, network-programmer, tools-programmer | — | gameplay-code, engine-code, ai-code, network-code, shader-code | всегда |
| `qa` | qa-lead, qa-tester, performance-analyst, security-engineer | test-setup, test-helpers, smoke-check, regression-suite, test-evidence-review, security-audit, skill-test, skill-improve | test-standards | всегда |
| `release` | release-manager, devops-engineer | sprint-plan, sprint-status, retrospective, milestone-review, release-checklist, changelog | — | всегда |

### Опциональные — движки (7)

| Модуль | Содержимое | Триггер установки |
|---|---|---|
| `engine-phaser` | скилл phaser-coder, правило phaser-code | проект на Phaser |
| `engine-unity` | 5 агентов Unity | проект на Unity (6.3 LTS) |
| `engine-godot` | 5 агентов Godot | проект на Godot 4 |
| `engine-unreal` | 5 агентов UE5 | проект на Unreal |
| `engine-sfml3` | 1 агент | проект на SFML 3 |
| `engine-raylib` | 1 агент | проект на Raylib |
| `engine-bevy` | 1 агент | проект на Bevy |

### Опциональные — домены (10)

| Модуль | Содержимое | Триггер |
|---|---|---|
| `architecture` | lead-programmer, architecture-review, create-control-manifest, propagate-design-change, design-docs | >5 модулей в архитектуре, несколько ADR |
| `ui` | ux-designer, ui-programmer, accessibility-specialist, ux-design, ux-review, team-ui, ui-code | UI больше 3 экранов |
| `localization` | localization-lead, localize | нужен второй язык |
| `art` | art-director, technical-artist, art-bible, art-spec, art-generate, asset-audit | внешние ассеты |
| `audio` | audio-director, sound-designer, team-audio | записанный звук/музыка |
| `narrative` | narrative-director, world-builder, writer, team-narrative, narrative | сюжет, лор, диалоги |
| `level-design` | level-designer, team-level | уровни |
| `live-ops` | live-ops-designer, community-manager, team-live-ops | игра уже выпущена |
| `data` | правило data-files | внешние data-файлы |
| `prototyping` | prototyper, prototype, hybrid-prototype, explore, prototype-code | этап поиска идеи |

### Опциональные — процессы (4)

| Модуль | Содержимое | Триггер |
|---|---|---|
| `stories` | create-epics, create-stories, story-readiness, dev-story, story-done | крупный проект, >20 систем |
| `qa-advanced` | qa-plan, bug-report, bug-triage, perf-profile, soak-test, test-flakiness, automated-smoke-test, autopilot-playtest, team-qa, team-polish | баги ведутся файлами, нужен профилинг |
| `release-launch` | release-checklist уже в release; launch-checklist, patch-notes, hotfix, day-one-patch | публичный запуск |
| `analytics` | analytics-engineer | появилась телеметрия |

### Отдельно

| Модуль | Содержимое | Триггер |
|---|---|---|
| `team-orchestration` | team-combat, team-release | несколько людей в команде |

Итого: **5 по умолчанию + 22 опциональных = 27 модулей**.

## Механизм «советника модулей»

Три точки входа:

1. **`/setup-engine`** — определяет движок и сразу предлагает соответствующий `engine-*`.
2. **`/start`** — определяет тип проекта (веб, мобильная, десктоп, с сюжетом) и предлагает доменные модули.
3. **Правило в AGENTS.md** — постоянная инструкция:

```
If a task requires capability that lives in an uninstalled module,
propose `node .opencode/modules/install.mjs add <module>` with a one-line
reason, wait for approval, then install. Never install silently.
```

Плюс команда `/modules` — список установленных и доступных с триггерами.

## Что меняется в поведении

| Сейчас | Будет |
|---|---|
| 52 агента в списке всегда | 14 в дефолте, остальные по требованию |
| 78 скиллов в списке всегда | ~30 в дефолте |
| Движки лежат мёртвым грузом | Ставятся под проект |
| `installed.json` — учёт | `installed.json` — управление контекстом |
| Двойное хранение | Один пул `library/` |

## Пробелы — обсуждаются отдельно

Из аудита, категория D: `engine-phaser` (закрывается в этом плане), правило `phaser-code`,
`ui-check`, `audio-check`, `balance-run`, `encoding-check`, `release-build`.
По решению от 2026-11-18 создаётся только `engine-phaser`; остальное — на следующем этапе.

## Порядок работ

1. Реструктуризация: `library/` + активный `.opencode/` + 27 манифестов.
2. Переписать `install.mjs` под пул, добавить `--list-available`, `--why`.
3. Починить симлинки Windows (junction).
4. Перенести патч `windowsHide` в 3 плагина.
5. Создать `engine-phaser` из `~/.config/opencode/skills/phaser-coder`.
6. Обновить `AGENTS.md`: правило советника, стек Phaser/Unity, дефолтный набор.
7. Написать инструкцию на русском: `docs/КАК-РАБОТАТЬ.md`.
8. Инициализировать git и создать удалённый репозиторий.

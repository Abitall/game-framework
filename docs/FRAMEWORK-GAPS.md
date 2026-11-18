# Framework Gaps — замечания из проекта Numtris

> Десять практических претензий к рабочему процессу, собранных после завершения
> Numtris. Для каждой: что уже есть во фреймворке, чего не хватает, предложение.
> Составлено 2026-11-18.

## Сводка

| # | Замечание | Статус | Решение |
|---|---|---|---|
| 1 | Всегда задавать уточняющие вопросы | ✅ | `Clarification Rule` в AGENTS.md |
| 2 | UTF-8 без поломок | ✅ | `tools/check-encoding.mjs` + `rules/encoding.md` + гейт pre-commit |
| 3 | Создавать репозиторий на GitHub | ✅ | скиллы `repo-init`, `repo-sync` (модуль `release`) |
| 4 | Два хоста: dev 5174, play 5173 | ✅ | `tools/play-host.mjs`, `tools/publish-play.mjs`, `rules/web-hosting.md` |
| 5 | Помогать держать пайплайн | ✅ | `production/PIPELINE.md` + `tools/pipeline.mjs` (исполняемые гейты) + `pipeline-guard` |
| 6 | Записывать удачные решения | ✅ | `tools/learn.mjs` (предложение → одобрение) + `docs/solutions/` |
| 7 | Долгие тесты: чекпоинты, ядра, предупреждение | ✅ | `tools/balance-progress.mjs`, `tools/run-affinity.ps1`, `rules/long-tests.md` |
| 8 | Бесплатный веб-поиск | ✅ | SearXNG в Docker + MCP-сервер `tools/searxng-mcp.mjs` |
| 9 | Удобный редактор UI для Phaser | ⏸ позже | паттерн панели тюнинга реализован как скилл; полный редактор отложен |
| 10 | Субагенты для сложных задач | ✅ | `Delegation Rule` в AGENTS.md |

### Второй этап (из сравнения с внешними фреймворками)

| Механизм | Инструмент |
|---|---|
| Исполняемые гейты с `check:` | `tools/pipeline.mjs` + `production/PIPELINE.md` |
| Контракт скоупа с baseline | `tools/scope.mjs` + `production/SCOPE.md` |
| Петля обучения с одобрением | `tools/learn.mjs` + `capture-solution` |
| Слепое A/B | `tools/ab.mjs` + `tools/reveal.mjs` + скилл `gauntlet` |
| Панель тюнинга | скилл `tuning-panel` (модуль `engine-phaser`) |
| «Сначала игра» | предупреждение в `pipeline.mjs status` |
| Маршрутизация моделей | `.framework/agent-routing.json` + `tools/change-model.mjs` |
| Шаблоны документов | модуль `templates`, 29 файлов |

> Внедрено 2026-11-18. Пункт 9 остаётся в этом документе как задача.

---

## 1. Уточняющие вопросы

**Есть:** `Collaboration Protocol` в AGENTS.md (Question → Options → Decision →
Draft → Approval), дисциплина `question`-тула в каждом скилле, требование
спрашивать разрешение перед записью.

**Нет:** явного правила «непонятно → спроси». Протокол покрывает *разрешение на
запись*, но не *неоднозначность задачи*. Агент может молча выбрать
интерпретацию.

**Предложение.** Раздел в AGENTS.md, сразу после Collaboration Protocol:

```markdown
## Clarification Rule

Ask before acting whenever any of these is true:
- the goal admits more than one reasonable interpretation
- two or more implementation paths differ in cost or reversibility
- the change touches more than 3 files or any ADR
- required data is missing (asset, config value, design decision)
- the request conflicts with an existing GDD, ADR or rule

Do not ask when:
- the user said "do it yourself", "no questions", "your call", "as you see fit"
- the answer is verifiable by reading the repo
- it is a mechanical, reversible step already covered by an approved plan

Format: one `question` call, 2-4 options, recommended option first.
Never ask two rounds of the same question.
```

Плюс строка в `start` и `dev-story`: «если задача неоднозначна — правило
Clarification Rule важнее скорости».

---

## 2. UTF-8

**Есть:** абзац в AGENTS.md (UTF-8, не переписывать через PowerShell без явной
кодировки, предпочитать edit/write или Node `fs`).

**Нет:** самого инструмента. `tools/check-encoding.mjs` существует только в
Numtris, в шаблоне его нет. `npm run check:encoding` в AGENTS.md — обещание без
реализации.

**Предложение.**
1. Перенести `check-encoding.mjs` в `tools/` фреймворка.
2. `package.json`: `"check:encoding": "node tools/check-encoding.mjs"`, включить
   в `npm test` и в pre-commit.
3. Правило `rules/encoding.md` (paths: `src/**`, `design/**`, `docs/**`,
   `assets/**`): только UTF-8, никаких BOM, не использовать `Set-Content` без
   `-Encoding utf8`, проверять после массовых правок.
4. Проверять не только исходники, но и `config`-строки (RU/EN таблицы — самое
   частое место поломки).

**Оценка:** 1 час, инструмент готов, нужно только перенести и подключить.

---

## 3. Репозиторий на GitHub

**Есть:** ничего. `gh` не установлен, токена нет.

**Предложение.** Модуль `devops` (или скилл в `release`):

- `/repo-init` — проверяет `gh auth status`, создаёт приватный репозиторий,
  ставит описание, добавляет `.gitignore`, делает первый коммит, пушит.
- `/repo-sync` — коммит с Conventional Commits + пуш, всегда с подтверждением.
- Правила в `opencode.json`: запрет `gh repo delete`, `gh auth token`,
  `git push --force` (уже добавлены).
- Без `gh`: инструкция создать пустой репозиторий вручную и передать URL.

**Оценка:** 1 час после установки `gh`.

---

## 4. Два хоста для веб-игр

**Есть:** ничего. Проблема реальная: агент перезапускает dev-сервер и
перезаписывает сборку, пока идёт плейтест.

**Предложение.** Разделить два контура:

| Контур | Порт | Кто пишет | Когда обновляется |
|---|---|---|---|
| Dev | 5173 | агент | постоянно, HMR |
| Play | 5174 | никто | только по команде `/publish-play` |

Реализация:

- `tools/play-host.mjs` — статический сервер над `dist-play/`, без watch.
- `npm run play` — собирает в `dist-play/` и поднимает 5174.
- `/publish-play` — скилл: собрать, скопировать в `dist-play/`, перезапустить
  сервер, сказать «обновлено». Никогда не делает этого сам.
- Правило в AGENTS.md: **никогда не трогать порт 5174 и `dist-play/` без явной
  команды**.
- Опционально: `PLAY_HOST_PORT` в `.env.local`.

**Оценка:** 2 часа.

---

## 5. Помогать держать пайплайн

**Есть:** `/gate-check` (7 фаз, PASS/CONCERNS/FAIL), `/scope-check`,
`docs/framework/workflow-catalog.yaml`, `/milestone-review`.

**Нет:** автоматического предупреждения «ты полируешь то, что ещё не работает».
В Numtris это случилось буквально: визуал и достижения при незакрытом core.

**Предложение.**

1. `production/PIPELINE.md` — единственный источник правды о фазе и гейтах:

```yaml
phase: production
systems:
  core-loop: done
  scoring: done
  achievements: not-started
open-gates: [vertical-slice]
```

2. Скилл `pipeline-guard` (+ команда `/pipeline`):
   - определяет фазу по артефактам (GDD, ADR, src, tests, dist);
   - классифицирует входящую задачу по фазе (core → polish → content → release);
   - если задача из более поздней фазы, чем незакрытые пункты — предупреждает:
     «это полировка, а core-loop не закрыт; сначала X, потом Y»;
   - обновляет гейты через `node tools/pipeline.mjs tick`.
3. Хук `ccgs-hooks` печатает в начале сессии: фазу, открытые гейты, следующий
   шаг. Одна строка, не блокирует.
4. Правило в AGENTS.md: перед крупной задачей вызвать `/pipeline`, если фаза
   неизвестна.

**Оценка:** 3 часа (скилл + YAML + строка в хуке).

---

## 6. Журнал удачных решений

**Есть:** ADR (архитектурные решения с альтернативами), `/retrospective`
(спринт), `production/session-state/active.md` (текущее состояние).
Ни один не отвечает на вопрос «какой приём сработал и почему».

**Нет:** журнала приёмов. Знание умирает вместе с сессией.

**Предложение.** `docs/solutions/` — по сферам, а не по датам:

```
docs/solutions/
  code.md        # приёмы TypeScript/Phaser
  gameplay.md    # что сработало в механике и балансе
  ui.md          # вёрстка, масштабирование, доступность
  tests.md       # как ловить баги, фикстуры, детерминизм
  art.md         # рисование кодом, палитры
  process.md     # как вести проект, что ускорило работу
  tools.md       # собственные инструменты и их устройство
```

Формат записи:

```markdown
## 2026-11-18 — Детерминированный каскад без рекурсии

**Проблема:** каскад на 5+ линиях давал разный результат при повторе.
**Перепробовали:** повторный проход по сетке (нестабильный порядок), очередь
с приоритетом (дубли).
**Сработало:** BFS-очередь с сортировкой по (строка, столбец) и явным
снимком состояния на каждом шаге.
**Почему:** порядок обхода фиксирован, состояние иммутабельно.
**Где применять:** любой пошаговый резолвер.
**Ссылки:** ADR-0003, `src/systems/Cascade.ts`.
```

**Триггеры записи** (правило `rules/solutions.md`):
- задача потребовала больше двух переделок;
- найдено неочевидное решение или обход ограничения движка;
- изменён скилл, правило или инструмент фреймворка;
- решение повторно используется во втором месте.

**Не дублировать ADR:** ADR — «почему выбрали X вместо Y и чем платим»;
solution — «как именно сделали, чтобы работало».

**Механизм:** скилл `capture-solution` + `/solution`. В конце проекта
`/retrospective` собирает из журнала итоги и предлагает, что поднять в правило
или скилл.

**Оценка:** 2 часа.

---

## 7. Долгие тесты

**Есть:** абзац в AGENTS.md про чекпоинты и resumable-прогоны; абзац про
hybrid CPU scheduling (P/E-ядра, `run-affinity.ps1`); `balance-check` упоминает
чекпоинты.

**Нет:** инструментов. `tools/balance-progress.mjs` и `tools/run-affinity.ps1`
есть только в Numtris.

**Предложение.**
1. Перенести оба инструмента в `tools/`.
2. Правило `rules/long-tests.md`:
   - оценить длительность до запуска (по числу прогонов × время одного);
   - если >60 с — предупредить и предложить: шардирование, чекпоинты,
     параллельность;
   - быстрые шарды → E-ядра, долгие → P-ядра, не более 8/12 воркеров;
   - прогресс в процентах и ETA, возобновление с чекпоинта.
3. `npm run test:long` с прогресс-репортером.
4. Хук: если команда похожа на длинный прогон (`--all`, `sweep`, `matrix`) и не
   переданы чекпоинты — предупреждение.

**Оценка:** 2 часа.

---

## 8. Бесплатный веб-поиск

**Есть:** `webfetch` и `websearch` как инструменты харнесса. Провайдер поиска —
на выбор пользователя; ключей нет.

**Нет:** провайдера без API-ключа.

**Варианты.**

| Вариант | Плюсы | Минусы |
|---|---|---|
| **SearXNG в Docker** | без ключей, приватно, агрегирует Google/Bing/DDG, JSON API | нужен Docker, ~200 МБ образ |
| DuckDuckGo HTML через `webfetch` | ничего не ставить | хрупко, без структуры, лимиты |
| Bing/Brave API | надёжно | нужен ключ, платно от объёма |

**Рекомендация:** SearXNG в Docker + MCP-сервер `searxng` (два метода: `search`,
`fetch`). Плюс fallback: `webfetch` на `https://html.duckduckgo.com/html/?q=`.

Конфигурация: `docker compose up -d searxng`, MCP-сервер в `opencode.json`,
`disabled: true` по умолчанию, включается когда нужен.

**Оценка:** 3 часа (compose + MCP-обёртка + проверка).

---

## 9. Редактор UI для Phaser

**Есть:** в Numtris — `tools/ui-inspector.mjs` (headless-проверка вёрстки,
переполнение, наложение текста). Это **проверка**, не редактор.

**Нет:** визуального редактирования. Любое «сдвинь на 8 пикселей» — это
переписка с агентом.

**Предложение.** Dev-only overlay в самой игре:

- `src/dev/UiEditor.ts`, включается при `DEVELOPER_TOOLS`:
  - выбор объекта по клику, drag, resize, snap к сетке;
  - панель свойств: x, y, scale, origin, alpha, шрифт, цвет;
  - undo/redo, горячие клавиши;
  - экспорт в `design/ui-layout.json` и автосохранение с debounce;
- рантайм читает layout из JSON (`UiLayout.load()`), а не из хардкода;
- после правок — `npm run check:ui` для скриншот-проверки;
- правило: layout-значения только из JSON, в коде — дефолты.

Это закрывает и пункт 9, и частично 2 (текст из JSON), и делает правки
мгновенными.

**Оценка:** 6–10 часов, самый крупный пункт. Логично делать отдельным модулем
`ui-editor`, чтобы не грузить в проекты без UI.

---

## 10. Субагенты

**Что это.** Субагент — отдельная сессия со своим контекстом, своим набором
инструментов и своим системным промптом. Родитель передаёт задачу текстом и
получает только итог. 52 агента фреймворка — это и есть субагенты.

**Когда выгодно:**
- исследование: «найди, как устроен X во всех 70 файлах» — родитель получит 10
  строк вместо 70 файлов;
- параллельные независимые задачи: тесты, линт, ревью, документация;
- узкая экспертиза: `phaser-coder` не тащит в контекст дизайн-документы;
- изоляция «грязной» работы: чтение логов, разбор 200 ошибок.

**Когда невыгодно:**
- задача требует диалога с пользователем — субагент не может задавать вопросы;
- мелкая правка в 5 строк — оверхед на запуск больше пользы;
- задача требует всего контекста текущей сессии — передать его целиком дорого;
- последовательная работа с общей правкой файлов — конфликты.

**Стоимость.** Каждый субагент — свой системный промпт (1–3k токенов) плюс всё,
что он прочитает. Пять параллельных исследователей могут стоить дороже одной
последовательной работы, если задача маленькая.

**Предложение.** Правило в AGENTS.md:

```markdown
## Delegation Rule

Delegate to a subagent when:
- the task is read-only research across more than 10 files
- two or more independent checks can run in parallel
- a specialist agent exists for the domain (engine, qa, security)

Do not delegate when:
- the task needs user dialogue
- the change is under ~20 lines
- the subagent would need most of the current session context
- two subagents would edit the same files

Always give the subagent: the goal, the files, the constraint, and the
expected output shape. Never pass "figure it out".
```

Плюс `/team-*` скиллы (опциональный модуль `team-orchestration`) — готовые
сценарии оркестрации, но они рассчитаны на команду людей.

**Оценка:** 30 минут (только правило).

---

## Порядок внедрения

| Приоритет | Пункты | Почему |
|---|---|---|
| 1 | 2, 7, 10 | дёшево, инструменты уже написаны, эффект сразу |
| 2 | 1, 5, 6 | правила и один скилл, меняют поведение |
| 3 | 3, 4 | инфраструктура, нужны gh и скрипты |
| 4 | 9 | крупная работа, отдельный модуль |
| 5 | 8 | зависит от Docker и внешних сервисов |

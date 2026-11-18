# Веб-поиск

Два источника, оба бесплатные, ключи не нужны.

| Источник | Что нужно | Когда используется |
|---|---|---|
| **SearXNG** (Docker) | Docker Desktop | первым, если запущен |
| **DuckDuckGo HTML** | ничего | автоматически, если SearXNG недоступен |

Сервер `tools/websearch-mcp.mjs` сам выбирает источник: пробует SearXNG, при
неудаче уходит в DuckDuckGo. Управлять можно переменной `SEARCH_PROVIDER`:
`auto` (по умолчанию), `searxng`, `duckduckgo`.

## Запускать ли SearXNG каждый раз

Нет. Три уровня, которые делают это за вас:

1. **Контейнер сам поднимается после старта Docker.** В `docker-compose.yml` стоит
   `restart: unless-stopped` — один раз запустили, дальше он живёт.
2. **Сервер поиска запускает его сам.** Если SearXNG не отвечает, `search`
   выполняет `docker compose up -d`, ждёт до 45 секунд и повторяет запрос.
   В ответе появляется пометка `(container started automatically)`.
3. **Если Docker не запущен вообще** — сервер не трогает его и уходит в
   DuckDuckGo. Поиск работает, просто без агрегации.

Единственное, что стоит сделать один раз: включить в Docker Desktop
**Settings → General → Start Docker Desktop when you sign in**. Тогда после
перезагрузки поднимется демон, за ним контейнер, и SearXNG будет доступен без
вашего участия.

Отключить автозапуск: `SEARXNG_AUTOSTART=never`.

## Быстрая проверка

**1. Сервер отвечает.** Запустите и отправьте `initialize`:

```powershell
@('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"check","version":"1"}}}') | node tools/websearch-mcp.mjs
```

Ожидаемый ответ: `{"result":{... "serverInfo":{"name":"websearch","version":"2.0.0"}}}`.

**2. Поиск работает.** Попросите агента найти что-нибудь или вызовите
инструмент `search` напрямую. В ответе будет первая строка вида
`[duckduckgo] 8 result(s)` или `[searxng] 8 result(s)` — она говорит, какой
источник ответил.

**3. SearXNG отдельно** (если Docker установлен):

```bash
npm run search:up
curl "http://localhost:8888/search?q=phaser+4&format=json"
npm run search:down
```

Если `curl` вернул HTML вместо JSON — не смонтировался `settings.yml`.

**4. Диагностика окружения:**

```bash
npm run check:env
```

Строка `mcp websearch` покажет, найдена ли команда сервера.

## Бесплатно ли это

| Что | Платно? |
|---|---|
| SearXNG | нет, открытый код (AGPL), работает локально |
| DuckDuckGo HTML | нет, ключей и аккаунта не требует |
| API-ключи | не нужны ни одному из двух |
| Оплата за запросы | нет |
| Расходы | электричество и ~200 МБ образа, если используете Docker |

Оговорки, которые стоит знать:

- У бесплатных источников **нет гарантий**: DuckDuckGo может показать капчу при
  частых запросах, SearXNG зависит от того, отвечают ли вышестоящие движки.
- Это не официальный API. При интенсивном использовании возможны блокировки.
- Для личного использования в разработке это обычная практика; для публичного
  сервиса читайте условия вышестоящих поисковиков.

## SearXNG в Docker

```bash
npm run search:up      # docker compose up -d
npm run search:down    # остановить
```

Порт 8888, настройки в `settings.yml` (JSON-вывод обязателен). Первый запуск
тянет образ ~200 МБ.

## Переменные

| Переменная | По умолчанию | Смысл |
|---|---|---|
| `SEARXNG_URL` | `http://localhost:8888` | адрес SearXNG |
| `SEARCH_PROVIDER` | `auto` | `auto`, `searxng` или `duckduckgo` |
| `SEARXNG_AUTOSTART` | `auto` | `auto` — поднимать контейнер самому, `never` — не трогать |
| `SEARCH_TIMEOUT_MS` | `15000` | таймаут одного запроса |

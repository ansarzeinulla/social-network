# SocialNet — Facebook-like social network

Учебный командный проект: лента постов, профили, подписки, группы, события, чаты (1-на-1 и групповые) и уведомления в реальном времени по WebSocket.

---

## Быстрый старт

### 1. Production-like — Caddy + backend + frontend в Docker (рекомендуется)

Один origin, без CORS, cookies и WebSocket работают как родные.

```bash
docker compose --profile proxy up --build
```

Открой: **http://localhost** *(порт 80, без `:3000`)*

Caddy маршрутизирует:
- `/api/*` → backend:8080
- `/ws` → backend:8080
- `/uploads/*` → backend:8080 (отдаёт картинки постов/аватаров)
- всё остальное → frontend:3000 (Next.js)

В фоне (отвязанный терминал):
```bash
docker compose --profile proxy up --build -d
docker compose logs -f          # стрим логов всех сервисов
docker compose --profile proxy down   # остановить
```

### 2. Backend + Frontend в Docker, без Caddy

Frontend сам ходит на `http://localhost:8080` через CORS — две точки входа на разных портах.

```bash
docker compose up --build
```

Открой: **http://localhost:3000**

### 3. Backend в Docker + Frontend на `npm run dev` (быстрая итерация фронта)

Самый удобный для разработки UI — HMR Next.js моментальный, backend в контейнере крутится отдельно.

```bash
# Терминал 1
docker compose up --build backend

# Терминал 2
cd frontend
cp .env.local.example .env.local   # один раз, если ещё не делал
npm install
npm run dev
```

Открой: **http://localhost:3000**

### Чистый старт (свежая БД с обновлённым seed)

Если хочешь обнулить всё (БД, загруженные картинки, кэш Caddy) и пересоздать с нуля:

```bash
docker compose --profile proxy down -v
docker compose --profile proxy up --build
```

Флаг `-v` сносит **все** named volumes проекта (см. раздел [Volumes](#docker-volumes) ниже). На свежем `backend_data` миграции применятся в правильном порядке и засеется dev-данные с картинками.

---

## Тестовые учётки

Пароль у всех — `Test123!`

| Email | Public | Особенность |
|-------|--------|-------------|
| `alice@test.com` | yes | Создатель Go Devs, mutual-follow с Bob, аватар + cover |
| `bob@test.com` | yes | Создатель TDD Practice, full-stack dev |
| `carol@test.com` | **no** | Приватный профиль (для теста privacy) |
| `dave@test.com` | yes | Создатель Coffee Lovers, бариста-энтузиаст |
| `eve@test.com` | no | Приватный профиль, hiker. Pending follow request to Alice |
| `frank@test.com` | yes | Фотограф/путешественник, член нескольких групп |
| `demo@test.com` | yes | Чистый demo-юзер без связей |

Seed данные включают: 17 постов (большинство с обложками), 21 комментарий (часть с картинками), 4 группы с постами/комментами/событиями/голосованиями, 30 личных сообщений в 6 диалогах, 21 групповое сообщение, 13 уведомлений разных типов.

---

## Стек

| Слой | Технология |
|------|------------|
| Backend | Go 1.25 (стандартный `net/http`) |
| База | SQLite + `golang-migrate` |
| Auth | Сессии через cookie + bcrypt |
| Realtime | `gorilla/websocket` |
| Frontend | Next.js 14 (Pages Router) + React 18 |
| Reverse proxy | Caddy 2 (включается профилем `proxy`) |
| Контейнеры | Docker Compose |

Все Go-зависимости из списка **Allowed Packages** учебного ТЗ: `gofrs/uuid`, `golang-migrate`, `mattn/go-sqlite3`, `gorilla/websocket`, `golang.org/x/crypto`.

### Что реализовано

- **Auth** — register / login / logout по cookie-сессии, bcrypt password hashing
- **Профили** — публичные/приватные, аватар + cover, follow/unfollow с подтверждением для приватных
- **Посты** — три уровня privacy (public / almost_private / private с выбором конкретных viewers), изображения, лайки с просмотром списка лайкнувших
- **Комментарии** — текст + изображения
- **Группы** — создание, приглашения, заявки на вступление с одобрением создателем, выход
- **Групповые посты / комменты / события** — события с голосованием going/not_going
- **Чат** — 1-на-1 и групповые через WebSocket, история, индикатор онлайна, unread-счётчики per-thread
- **Уведомления** — `follow_request`, `new_follower`, `group_invite`, `group_request`, `group_accepted`, `new_event`. Real-time через WS + fallback на reconnect-refetch
- **Поиск** — `/api/search?q=...&kind=all|users|posts|comments|messages` с уважением privacy

---

## Docker volumes

Все persistent данные хранятся в **named volumes** Docker — на host файловой системе их нет, живут внутри WSL2 VM Docker Desktop.

| Volume | Что хранит | Содержимое |
|---|---|---|
| `social-network_backend_data` | `/app/data` контейнера backend | `social_network.db` (SQLite) + `uploads/` (юзер-аватарки, post images, seed-плашки) |
| `social-network_caddy_data` | `/data` контейнера caddy | SSL-сертификаты (когда работаешь с реальным доменом), state Caddy |
| `social-network_caddy_config` | `/config` контейнера caddy | runtime config Caddy (auto-managed) |

### Управление volumes

```bash
# Посмотреть список
docker volume ls

# Размер каждого
docker system df -v

# Удалить ВСЁ persistent state проекта (DB, uploads, ssl)
docker compose --profile proxy down -v

# Удалить только БД (оставить SSL):
docker compose down
docker volume rm social-network_backend_data
```

### Backup БД

```bash
# Дамп БД на host
docker run --rm \
  -v social-network_backend_data:/data \
  -v ${PWD}:/backup \
  alpine cp /data/social_network.db /backup/backup-$(date +%Y%m%d).db
```

---

## Stage и Production deployment

В проекте по умолчанию **development** конфигурация (`auto_https off` в Caddy, мок-возможности в frontend, бэк без оптимизаций). Для stage / prod используется паттерн **override-файлов** Docker Compose.

### Идея overrides

`docker-compose.yml` — базовая dev-конфигурация. Стандартный механизм Compose позволяет наслаивать поверх неё `docker-compose.<env>.yml` файлы:

```bash
# Stage
docker compose -f docker-compose.yml -f docker-compose.stage.yml --profile proxy up -d --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile proxy up -d --build
```

Compose сольёт настройки — то что в override переопределяет base.

### Что должно быть в `docker-compose.stage.yml`

```yaml
services:
  frontend:
    build:
      args:
        NEXT_PUBLIC_API_URL: ""     # same-origin через Caddy
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_USE_MOCK_FOLLOWERS: "false"
      NEXT_PUBLIC_USE_MOCK_PROFILE: "false"
      # все mocks выключены — реальный backend

  backend:
    environment:
      LOG_LEVEL: info
    restart: unless-stopped

  caddy:
    environment:
      CADDY_DOMAIN: stage.example.com
```

И в `Caddyfile` для stage:
```
{
  email admin@example.com           # для Let's Encrypt
}

stage.example.com {
  reverse_proxy /api/* backend:8080
  reverse_proxy /ws backend:8080
  reverse_proxy /uploads/* backend:8080
  reverse_proxy * frontend:3000
}
```

Auto-HTTPS включится автоматически (Caddy сам получит Let's Encrypt сертификаты, они лягут в volume `caddy_data`).

### Что добавить в `docker-compose.prod.yml`

То же что stage, плюс:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      target: production        # multi-stage Next.js build с next build → next start
    deploy:
      resources:
        limits:
          memory: 512M
```

Для prod-фронта надо доработать `frontend/Dockerfile` — multi-stage с `npm run build` → `npm start` (а не `npm run dev`):

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

### Чек-лист перед prod

1. ⚠️ **Не использовать seed данные** — `docker volume rm social-network_backend_data` либо отдельный image без `seed_uploads/` и без `099999_seed_dev_data` миграции
2. **Bcrypt cost** — в `backend/pkg/handlers/auth_register.go` поднять с 10 до 12+
3. **Email-домены тестовых юзеров** очевидно не использовать
4. **Caddy auto_https** — убрать `auto_https off` из Caddyfile
5. **Real domain в Caddyfile** — не `:80`, а `your-domain.com`
6. **DB backup** — настроить периодический копир `social_network.db` (см. раздел Volumes)
7. **Image upload limits** — `ProcessImageUpload` уже capит на 5MiB, проверь что Caddy не выставляет больше
8. **Rate limiting** — добавить middleware для login/register endpoints
9. **CORS** — в prod через Caddy CORS не нужен (single origin), но если используется `docker compose up` без caddy — проверь `middleware/cors.go`

### Какие переменные среды нужны на CI/CD

| Переменная | Где | Пример |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend build-time | `""` (если через Caddy) или `https://api.example.com` |
| `CADDY_DOMAIN` | runtime caddy | `example.com` |
| `LOG_LEVEL` | runtime backend | `info` / `warn` / `error` |

---

## Структура проекта

```
social-network/
├── docker-compose.yml         # base config: backend + frontend (+ optional caddy profile)
├── Caddyfile                  # reverse-proxy config (зашивается в caddy image через caddy.Dockerfile)
├── caddy.Dockerfile           # кастомный caddy image с baked-in Caddyfile
├── README.md                  # этот файл
│
├── backend/
│   ├── server.go              # роутер + main
│   ├── go.mod
│   ├── Dockerfile             # multi-stage: golang build → alpine runtime
│   ├── seed_uploads/          # SVG-плашки для seed (запекаются в /app/data/uploads/)
│   └── pkg/
│       ├── db/sqlite/         # DB-слой (CRUD + schema в migrations/)
│       │   └── migrations/sqlite/    # 17 schema + 4 ext + 1 seed (099999)
│       ├── handlers/          # HTTP-handlers по фичам (auth, posts, chats, groups, search, ...)
│       ├── middleware/        # auth, cors
│       ├── models/            # типы данных
│       ├── utils/             # validate, image, validate_test.go (TDD-паттерн)
│       └── websocket/         # hub, client, bridge — gorilla/ws
│
└── frontend/
    ├── package.json
    ├── jest.config.js
    ├── Dockerfile             # Next.js dev image (для prod — поменять target, см. выше)
    └── src/
        ├── pages/             # Next.js Pages Router (login, feed, profile, chats, groups, search, ...)
        ├── components/        # Layout, Navbar, PostCard, ConfirmModal, LikersModal, Avatar
        ├── hooks/             # useUser (модульно-кэшированный), useWebSocket (reconnect+ws:open broadcast)
        └── services/          # api.js (apiJSON + withMock) + per-feature сервисы + mocks/
```

---

## Git workflow для команды

**Один модуль = одна ветка = один человек = один PR.**

### Создание ветки

```bash
git checkout main
git pull --rebase origin main
git checkout -b feat/<module>
```

Префиксы: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`.

### Definition of Done

```bash
# Backend
cd backend
go build ./...
go test ./...

# Frontend
cd frontend
npm test
npm run build
```

Если что-то красное — **не пушим**.

### Conventional Commits

```
feat(auth):     add nickname/avatar/about_me to User model
fix(posts):     drop title column per spec requirements
test(followers): table-driven follow/unfollow flow
chore(ci):      add jest config to frontend
```

### Принятие PR в main

После апрува автор делает **Squash and merge** на GitHub. 1 PR → 1 коммит. Локально:

```bash
git checkout main
git pull --rebase origin main
git branch -d feat/<module>
git push origin --delete feat/<module>
```

### Запрещено

- ❌ Push напрямую в `main`
- ❌ Force-push в `main`
- ❌ Мерж своего PR без ревью
- ❌ Коммитить `.env.local`, `*.db`, `node_modules/`, `uploads/`
- ❌ Менять `go.mod` без согласования (Allowed Packages под надзором)

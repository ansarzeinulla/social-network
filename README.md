# SocialNet — Facebook-like social network

Учебный командный проект: лента постов, профили, подписки, группы, события, чаты (1-на-1 и групповые) и уведомления в реальном времени по WebSocket.

## Стек

| Слой | Технология |
|------|------------|
| Backend | Go 1.25 (стандартный `net/http`) |
| База | SQLite + `golang-migrate` |
| Auth | Сессии через cookie + bcrypt |
| Realtime | `gorilla/websocket` |
| Frontend | Next.js 14 (Pages Router) + React 18 |
| Reverse proxy | Caddy 2 |
| Контейнеры | Docker Compose |

Все Go-зависимости из списка **Allowed Packages** учебного ТЗ:
`gofrs/uuid`, `golang-migrate`, `mattn/go-sqlite3`, `gorilla/websocket`, `golang.org/x/crypto`.

---

## Быстрый старт

### Через Caddy (single-origin, как на проде)

```bash
docker compose up --build
```

Открой: **http://localhost**

Логин тестовым юзером: `alice@test.com` / `Test123!`

### Без Caddy (прямой dev доступ)

```bash
docker compose up --build backend          # бэк в Docker (CGO/sqlite уже настроены)
cd frontend && npm install && npm run dev  # фронт локально
```

Открой: **http://localhost:3000**

### Чистый старт (свежая БД с seed-данными)

```bash
docker compose down
rm -f backend/pkg/db/sqlite/social_network.db
docker compose up --build
```

---

## Тестовые учётки (пароль у всех `Test123!`)

| Email | Public | Особенность |
|-------|--------|-------------|
| `alice@test.com` | yes | Лидер Go Devs, mutual follow с Bob |
| `bob@test.com` | yes | Лидер TDD Practice |
| `carol@test.com` | **no** | Приватный профиль (для теста privacy) |
| `dave@test.com` | yes | Лидер Coffee Lovers |
| `eve@test.com` | no | У неё pending запрос к Alice |
| `frank@test.com` | yes | Member двух групп |
| `demo@test.com` | yes | Чистый demo юзер |

В seed-миграции заполнены **все 14 таблиц**: followers (mutual/pending), posts (3 типа privacy + post_viewers), comments, groups + memberships (member/invited/requested), group_posts/comments/events + voting, чаты 1-на-1, групповые чаты, уведомления.

---

## Структура проекта

```
social-network/
├── docker-compose.yml          # caddy + backend + frontend
├── Caddyfile                   # reverse proxy: /api → backend, /ws → backend, /* → frontend
├── README.md                   # этот файл
│
├── backend/
│   ├── server.go               # роутер + main
│   ├── go.mod
│   ├── Dockerfile
│   └── pkg/
│       ├── db/sqlite/          # DB-слой (CRUD, схема в migrations/)
│       │   └── migrations/sqlite/    # 17 таблиц + 1 seed (000999)
│       ├── handlers/           # HTTP-handlers по фичам
│       ├── middleware/         # auth, cors
│       ├── models/             # типы данных
│       ├── utils/              # validate, image, validate_test.go (TDD-паттерн)
│       └── websocket/          # hub, client, bridge
│
└── frontend/
    ├── package.json
    ├── jest.config.js
    ├── Dockerfile
    └── src/
        ├── pages/              # Next.js Pages Router
        ├── components/         # Layout, Navbar, PostCard
        ├── hooks/              # useUser, useWebSocket
        └── services/           # api.js + service-обёртки + mocks/
```

---

## Команда: правила работы с git

### Принцип

**Один модуль = одна ветка = один человек = один PR.** Это защищает от конфликтов
в git и от ситуации "никто не знает, что в этом файле".

### Создание ветки

```bash
git checkout main
git pull --rebase origin main          # всегда стартуй со свежего main
git checkout -b feat/<module>          # имя: feat/, fix/, docs/, refactor/, test/
```

Примеры имён:
- `feat/group-events` — новая фича
- `fix/avatar-upload-mime` — баг-фикс
- `test/followers-flow` — тесты
- `docs/api-spec` — документация

### Коммиты (Conventional Commits)

```
feat(auth):     add nickname/avatar/about_me to User model
fix(posts):     drop title column per spec requirements
test(followers): table-driven follow/unfollow flow
chore(ci):      add jest config to frontend
refactor(api):  switch api.js to support mock toggles
```

Один логический шаг = один коммит. Не нужно делать "и пятница, и всё подряд".

### Перед `git push` (Definition of Done)

```bash
# Backend
cd backend
go build ./...      # собирается?
go test ./...       # тесты зелёные?

# Frontend
cd frontend
npm test            # jest зелёный?
npm run build       # next build проходит?
```

Если что-то красное — **не пушим**. Иначе сломаем main у всех.

### Push и Pull Request

```bash
git push -u origin feat/<module>
```

После пуша:
1. Открой Pull Request на GitHub: `feat/<module>` → `main`
2. В описании PR — чеклист:
   - [ ] что добавлено
   - [ ] что удалено / поменяно
   - [ ] миграции (если есть)
   - [ ] тесты
   - [ ] как проверить вручную
3. Назначь **минимум одного ревьюера** из активных в команде
4. Жди апрува, **сам в свой PR не мерж**

### Как ревьюить чужой PR

```bash
git fetch origin
git checkout feat/<module>
docker compose up --build      # или dev-режим
```

Чеклист ревьюера:
- [ ] Код собирается локально
- [ ] Тесты проходят (`go test ./...` + `npm test`)
- [ ] Фича работает в браузере (smoke-test по PR-чеклисту)
- [ ] Нет хардкода `localhost:8080` (используй `fetchApi` / `assetURL`)
- [ ] Нет закомментированного кода / `console.log` / `fmt.Println("debug")`
- [ ] Если поменяна модель/схема — есть миграция, и в seed (`000999`) обновлены данные если нужно
- [ ] Нет нарушений Allowed Packages в `go.mod`

Если всё ок: **Approve** + комментарий "LGTM".
Если есть замечания: оставь inline-комментарии и **Request changes**.

### Принятие PR в main

После апрува автор PR делает **Squash and merge** на GitHub:
- 1 PR → 1 коммит в main с осмысленным сообщением
- Локально после мержа:
  ```bash
  git checkout main
  git pull --rebase origin main
  git branch -d feat/<module>            # удалить локальную ветку
  git push origin --delete feat/<module> # и удалённую
  ```

### Проверка свежих изменений в main

Раз в день (или после уведомления о merge):

```bash
git checkout main
git pull --rebase origin main
git log --oneline -10                  # что нового
docker compose up --build              # запустить и проверить, что не сломалось
```

Если упал твой feature-branch после rebase — ребейзишь свою ветку:

```bash
git checkout feat/<module>
git rebase main
# исправляешь конфликты, если есть
git push --force-with-lease            # ВАЖНО: --force-with-lease, не --force!
```

### Что **нельзя**

- ❌ Пушить напрямую в `main` (только через PR)
- ❌ Force-push в `main`
- ❌ Мержить свой PR без ревью
- ❌ Коммитить `.env.local`, `*.db`, `node_modules/`, `uploads/` — всё это в `.gitignore`
- ❌ Менять `go.mod` без согласования (Allowed Packages под надзором)

---

## Карта модулей и владение

| #  | Модуль | Сложность | Backend | Frontend |
|----|--------|-----------|---------|----------|
| 1  | auth | low | `handlers/auth_*.go`, `models/user.go` | `pages/login.js`, `pages/register.js` |
| 2  | posts | medium | `handlers/post_*.go`, `db/sqlite/posts.go` | `pages/index.js`, `pages/newpost.js`, `pages/post/*` |
| 3  | followers | medium | `handlers/followers.go`, `db/followers.go` | `pages/profile/[id].js` |
| 4  | profile | low | `handlers/profile.go` | `pages/profile/*` |
| 5  | notifications | medium | `handlers/notif.go`, `db/notifications.go` | `pages/notifications.js` |
| 6  | chat | high | `handlers/chat.go`, `db/chats.go`, `websocket/*` | `pages/chats/*`, `hooks/useWebSocket.js` |
| 7  | groups | high | `handlers/group_*.go`, `db/groups.go` | `pages/groups/*`, `pages/mygroups.js` |
| 8  | comments | low | `handlers/comment.go`, `db/comments.go` | (внутри post-страниц) |
| 9  | image upload | low | `utils/image.go` | `pages/newpost.js`, `pages/register.js` |
| 10 | infra | low | `Caddyfile`, `docker-compose.yml`, Dockerfile-ы | — |

---

## Тестирование (TDD-light)

### Где TDD обязателен (red → green → refactor)

- Auth (login/register/sessions) — security
- Post privacy (public/almost_private/private) — privacy violations = провал ТЗ
- Followers (accept/decline state machine) — privacy
- Group access — privacy
- Validation utils — чистые функции, дёшево покрыть
- Image MIME — security (защита от подмены `.exe` под `.jpg`)

### Где TDD НЕ нужен

- UI-компоненты (рендер, стили)
- Простые DB-обёртки без бизнес-логики
- WebSocket-транспорт (тестируем поведение через bridge на уровне выше)

### Запуск тестов

```bash
# Backend
cd backend
go test ./...                     # всё
go test ./pkg/utils -v            # один пакет
go test -cover ./...              # покрытие

# Frontend
cd frontend
npm test                          # один прогон
npm run test:watch                # watch-mode при разработке
```

Паттерны для копирования:
- Backend: `backend/pkg/utils/validate_test.go`
- Frontend: `frontend/src/services/__tests__/api.test.js`

---

## Mock-слой во фронте (для параллельной разработки)

Пока бэк-модуль ещё пишется, фронт работает на моках:

```bash
# frontend/.env.local
NEXT_PUBLIC_USE_MOCK_FOLLOWERS=true   # модуль ещё не готов
NEXT_PUBLIC_USE_MOCK_GROUPS=false     # модуль готов, идём в реальный API
```

Также при HTTP **404 / 501..504** или network-error `withMock()` автоматически
фолбэчится на mock — можно запускать только фронт без бэка.

См. `frontend/src/services/api.js` (`withMock`), `frontend/src/services/mocks/`.

---

## Полезные команды

```bash
docker compose logs -f                    # логи всех сервисов
docker compose logs -f backend            # только бэк
docker compose up -d --build backend      # перезапустить только бэк
docker compose exec backend sqlite3 /app/pkg/db/sqlite/social_network.db
docker compose down                       # остановить
```

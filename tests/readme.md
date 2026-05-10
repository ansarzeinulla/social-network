# Shell API Tests

Эти тесты проверяют backend через HTTP API на `localhost:8080`. Каждый сценарий сам создает свежих тестовых пользователей/группы/посты, поэтому тесты можно запускать повторно.

## 1. Запусти backend

Из корня проекта:

```bash
docker compose up --build -d backend
```

Проверь, что API отвечает:

```bash
curl -i http://localhost:8080/api/profile
```

Ожидаемый ответ без cookie: `401 Unauthorized`. Это нормально: значит backend жив и защищенные ручки работают.

Для WebSocket-тестов нужен установленный Go: они запускают маленький helper [ws_client.go](./ws_client.go) через `go run` из backend-модуля.

## 2. Запустить все shell-тесты

Из корня проекта:

```bash
./tests/run_all.sh
```

Если все хорошо, каждый файл закончится строкой вида:

```text
PASS: <test-name>.sh completed ... checks against http://localhost:8080
```

## 3. Запустить тесты одной папки

Примеры:

```bash
for test in tests/auth/*.sh; do "$test"; done
for test in tests/profile/*.sh; do "$test"; done
for test in tests/followers/*.sh; do "$test"; done
for test in tests/posts/*.sh; do "$test"; done
for test in tests/groups/*.sh; do "$test"; done
for test in tests/events/*.sh; do "$test"; done
for test in tests/chat/*.sh; do "$test"; done
for test in tests/notifications/*.sh; do "$test"; done
```

## 4. Запустить один тест

```bash
./tests/posts/post_privacy.sh
./tests/groups/group_requests.sh
./tests/chat/chat_ws_drops.sh
```

## 5. Если backend не на localhost:8080

Можно переопределить URL:

```bash
TEST_BASE_URL=http://localhost:8081 ./tests/auth/login.sh
```

Или для всего набора:

```bash
export TEST_BASE_URL=http://localhost:8081
find tests -mindepth 2 -maxdepth 2 -name "*.sh" | sort | while read -r test; do
  echo "==> $test"
  "$test"
done
```

## 6. Проверка синтаксиса shell-файлов

```bash
find tests -name "*.sh" -print0 | xargs -0 bash -n
```

## 7. Backend unit/build sanity check

Перед или после shell-тестов полезно прогнать Go-тесты:

```bash
cd backend
go test ./...
```

## 8. Чистая база

Docker использует named volume `backend_data`, поэтому данные переживают перезапуск контейнера. Обычно это не мешает: тесты создают уникальные email через `RUN_ID`.

Если нужен полностью чистый старт:

```bash
./tests/run_all.sh --fresh-db
```

Отдельная smoke-проверка миграций и seed-данных:

```bash
./tests/system/fresh_boot.sh
```

## 9. Частые проблемы

`curl: Failed to connect to localhost port 8080`  
Backend не запущен или порт занят. Запусти:

```bash
docker compose up --build -d backend
```

`expected HTTP ..., got ...`  
Смотри `Body:` в выводе теста. Скрипты печатают тело ответа при падении.

`permission denied` при запуске `.sh`  
Верни execute-bit:

```bash
find tests -name "*.sh" -exec chmod +x {} \;
```

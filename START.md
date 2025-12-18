# Инструкция по запуску проекта

## Предварительные требования

- **Docker Desktop** (для PostgreSQL, Redis, MinIO)
- **Go** (версия 1.19 или выше)
- **Node.js** (версия 18 или выше)
- **npm** или **yarn**

## Шаг 1: Запуск Docker контейнеров (база данных и сервисы)

Откройте терминал в корневой директории проекта и выполните:

```bash
docker-compose up -d
```

Эта команда запустит:
- **PostgreSQL** на порту `5432`
- **Redis** на порту `6379`
- **MinIO** на портах `9000` (API) и `9001` (Console UI)
- **Adminer** на порту `8081` (веб-интерфейс для PostgreSQL)

Проверить статус контейнеров:
```bash
docker-compose ps
```

Остановить контейнеры:
```bash
docker-compose down
```

## Шаг 2: Настройка MinIO

После запуска Docker контейнеров:

1. Откройте MinIO Console в браузере: http://localhost:9001
2. Войдите с учетными данными:
   - Username: `minio`
   - Password: `minio124`
3. Создайте bucket с именем `gases`:
   - Нажмите "Create Bucket"
   - Введите имя: `gases`
   - Нажмите "Create Bucket"

## Шаг 3: Миграция базы данных (опционально)

Если нужны миграции БД, выполните:

```bash
go run cmd/migrate/main.go
```

## Шаг 4: Запуск бэкенда (Go сервер)

В корневой директории проекта:

```bash
go run cmd/GaseProject/main.go
```

Или скомпилируйте и запустите:

```bash
go build -o main.exe cmd/GaseProject/main.go
./main.exe
```

Бэкенд будет доступен на: **http://localhost:8080**

Документация Swagger: **http://localhost:8080/swagger/index.html**

## Шаг 5: Запуск фронтенда

Откройте новый терминал и перейдите в директорию фронтенда:

```bash
cd gase-frontend
```

Установите зависимости (если еще не установлены):

```bash
npm install
```

Запустите dev-сервер:

```bash
npm run dev
```

Фронтенд будет доступен на: **http://localhost:5173**

## Проверка работы

1. **Фронтенд**: http://localhost:5173
2. **Бэкенд API**: http://localhost:8080
3. **Swagger документация**: http://localhost:8080/swagger/index.html
4. **Adminer (БД)**: http://localhost:8081
5. **MinIO Console**: http://localhost:9001

## Учетные данные для тестирования

### База данных (PostgreSQL через Adminer)
- **System**: PostgreSQL
- **Server**: postgres
- **Username**: myuser
- **Password**: mypassword
- **Database**: mydb

### MinIO
- **Username**: minio
- **Password**: minio124

## Переменные окружения (опционально)

Бэкенд использует переменные окружения для настройки. По умолчанию:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=myuser`
- `DB_PASS=mypassword`
- `DB_NAME=mydb`
- `PORT=8080`
- `MINIO_ENDPOINT=localhost:9000`
- `MINIO_ACCESS_KEY=minio`
- `MINIO_SECRET_KEY=minio124`
- `MINIO_BUCKET=gases`

## Устранение проблем

### Порты заняты
Если порты заняты, можно изменить их в `docker-compose.yml` или остановить другие сервисы.

### Ошибка подключения к БД
Убедитесь, что Docker контейнеры запущены:
```bash
docker-compose ps
```

### Ошибки компиляции Go
Проверьте версию Go:
```bash
go version
```

Установите зависимости Go:
```bash
go mod download
```

### Ошибки npm
Очистите кэш и переустановите зависимости:
```bash
cd gase-frontend
rm -rf node_modules package-lock.json
npm install
```

## Остановка проекта

1. Остановите фронтенд: `Ctrl+C` в терминале с `npm run dev`
2. Остановите бэкенд: `Ctrl+C` в терминале с Go сервером
3. Остановите Docker контейнеры:
```bash
docker-compose down
```

Для полной очистки (включая volumes):
```bash
docker-compose down -v
```


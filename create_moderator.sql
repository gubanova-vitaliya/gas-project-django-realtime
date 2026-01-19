-- Скрипт для создания пользователя-модератора
-- Использование: docker exec -i lab8-postgres-1 psql -U postgres -d gas_project -f - < create_moderator.sql
-- Или: psql -h localhost -p 5432 -U postgres -d gas_project -f create_moderator.sql

-- ВАЖНО: Хеш пароля сгенерирован с помощью bcrypt для пароля "moderator"
-- Для генерации нового хеша используйте Go скрипт: go run cmd/create_moderator/main.go

-- Вариант 1: Создать нового модератора с логином "moderator" и паролем "moderator"
INSERT INTO users (login, password, is_moderator)
VALUES (
    'moderator',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.XeQb8TjQ4T5.VlEoKi', -- пароль: moderator
    true
)
ON CONFLICT (login) DO UPDATE SET
    password = EXCLUDED.password,
    is_moderator = EXCLUDED.is_moderator;

-- Вариант 2: Изменить существующего пользователя на модератора (раскомментируйте):
-- UPDATE users SET is_moderator = true WHERE login = 'ваш_логин';

-- Проверка: показать всех пользователей
SELECT id, login, is_moderator FROM users ORDER BY id;

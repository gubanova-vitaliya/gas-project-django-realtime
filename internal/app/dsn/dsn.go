package dsn

import (
	"fmt"
	"os"
)

// getEnvOrDefault возвращает значение переменной окружения или значение по умолчанию
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func FromEnv() string {
	// Используем значения по умолчанию для локальной разработки
	host := getEnvOrDefault("DB_HOST", "localhost")
	port := getEnvOrDefault("DB_PORT", "5432")
	user := getEnvOrDefault("DB_USER", "postgres")
	pass := getEnvOrDefault("DB_PASS", "1234")
	dbname := getEnvOrDefault("DB_NAME", "lab2")

	// И вот мы возвращаем dsn, который необходим для подключения к БД
	// sslmode=disable отключает SSL для локальной разработки
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, pass, dbname)
}

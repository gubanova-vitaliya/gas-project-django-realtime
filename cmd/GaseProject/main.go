package main

import (
	_ "WEB/docs"
	"WEB/internal/app/config"
	"WEB/internal/app/dsn"
	"WEB/internal/app/handler"
	"WEB/internal/app/repository"
	"WEB/internal/pkg"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// getEnvOrDefault возвращает значение переменной окружения или значение по умолчанию
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// @title GaseProject API
// @version 1.0
// @description API для управления газами и расчетами

// @contact.name API Support
// @contact.url http://localhost:8080
// @contact.email support@gaseproject.com

// @license.name MIT

// @host localhost:8080
// @BasePath /
// @schemes http

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT Token
// CORS middleware для разрешения запросов с GitHub Pages и других доменов
// Поддерживает как конкретные домены (для credentials), так и * (для простых запросов)
func corsMiddleware() gin.HandlerFunc {
	// Список разрешенных доменов для production
	// Можно настроить через переменную окружения CORS_ALLOWED_ORIGINS (разделенные запятой)
	allowedOriginsEnv := getEnvOrDefault("CORS_ALLOWED_ORIGINS", "")
	var allowedOrigins []string
	if allowedOriginsEnv != "" {
		allowedOrigins = strings.Split(allowedOriginsEnv, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}
	}

	// По умолчанию разрешаем localhost для development (HTTP и HTTPS)
	defaultOrigins := []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"http://localhost:5174",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:5173",
		"https://localhost:3000",
		"https://localhost:5173",
		"https://localhost:5174",
		"https://127.0.0.1:3000",
		"https://127.0.0.1:5173",
	}

	// Добавляем поддержку локальных IP адресов для HTTPS (192.168.x.x, 10.x.x.x и т.д.)
	// Это нужно для работы с GitHub Pages через локальный бэкенд
	if allowedOriginsEnv == "" {
		// Если не указаны явно, добавляем паттерны для локальных IP
		logrus.Debug("CORS: Will allow local IP addresses for HTTPS")
	}

	// Объединяем default и custom origins
	allAllowedOrigins := append(defaultOrigins, allowedOrigins...)

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Если origin не указан, разрешаем все (для простых запросов без credentials)
		if origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			// Проверяем, разрешен ли origin
			allowed := false
			for _, allowedOrigin := range allAllowedOrigins {
				if origin == allowedOrigin {
					allowed = true
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
					break
				}
			}

			// Если origin не найден в списке, но это localhost (для development)
			if !allowed && (strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "https://localhost")) {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				allowed = true
			}

			// Разрешаем локальные IP адреса для HTTPS (192.168.x.x, 10.x.x.x и т.д.)
			// Это нужно для работы с GitHub Pages через локальный бэкенд
			if !allowed && strings.HasPrefix(origin, "https://") {
				// Проверяем, является ли это локальным IP адресом
				if strings.Contains(origin, "192.168.") ||
					strings.Contains(origin, "10.") ||
					strings.Contains(origin, "172.16.") ||
					strings.Contains(origin, "172.17.") ||
					strings.Contains(origin, "172.18.") ||
					strings.Contains(origin, "172.19.") ||
					strings.Contains(origin, "172.20.") ||
					strings.Contains(origin, "172.21.") ||
					strings.Contains(origin, "172.22.") ||
					strings.Contains(origin, "172.23.") ||
					strings.Contains(origin, "172.24.") ||
					strings.Contains(origin, "172.25.") ||
					strings.Contains(origin, "172.26.") ||
					strings.Contains(origin, "172.27.") ||
					strings.Contains(origin, "172.28.") ||
					strings.Contains(origin, "172.29.") ||
					strings.Contains(origin, "172.30.") ||
					strings.Contains(origin, "172.31.") {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
					allowed = true
					logrus.Debugf("CORS: Allowing local IP HTTPS origin: %s", origin)
				}
			}

			// Если origin не найден, но нужен для GitHub Pages или других публичных доменов
			// Используем * только если credentials не требуются
			if !allowed {
				// Для GitHub Pages и других публичных доменов разрешаем все
				// Но без credentials (браузеры не позволяют * с credentials)
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
				logrus.Debugf("CORS: Allowing origin %s with wildcard (no credentials)", origin)
			}
		}

		// Устанавливаем остальные заголовки CORS
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Max-Age", "3600") // Кэширование preflight на 1 час

		// Обрабатываем preflight запросы
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	router := gin.Default()

	// Добавляем CORS middleware для всех запросов
	router.Use(corsMiddleware())

	// Добавляем Swagger
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	conf, err := config.NewConfig()
	if err != nil {
		logrus.Fatalf("error loading config: %v", err)
	}

	postgresString := dsn.FromEnv()
	logrus.Infof("Database connection string: host=%s port=%s user=%s dbname=%s",
		getEnvOrDefault("DB_HOST", "localhost"),
		getEnvOrDefault("DB_PORT", "5432"),
		getEnvOrDefault("DB_USER", "postgres"),
		getEnvOrDefault("DB_NAME", "lab2"))

	rep, err := repository.New(postgresString)
	if err != nil {
		logrus.Fatalf("error initializing repository: %v", err)
	}

	hand := handler.NewHandler(rep)

	application, err := pkg.NewApp(conf, router, hand, rep)
	if err != nil {
		logrus.Fatalf("error creating application: %v", err)
	}

	application.RunApp()
}

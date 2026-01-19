package pkg

import (
	"WEB/internal/app/config"
	"WEB/internal/app/ds"
	"WEB/internal/app/handler"
	"WEB/internal/app/repository"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/sirupsen/logrus"
)

type Application struct {
	Config      *config.Config
	Router      *gin.Engine
	Handler     *handler.Handler
	Repository  *repository.Repository
	RedisClient interface{} // временно interface{} вместо *redis.Client
}

func NewApp(c *config.Config, r *gin.Engine, h *handler.Handler, repo *repository.Repository) (*Application, error) {
	// Временно отключаем Redis
	return &Application{
		Config:     c,
		Router:     r,
		Handler:    h,
		Repository: repo,
	}, nil
}

func (a *Application) RunApp() {
	logrus.Info("Server start up")

	a.Handler.RegisterHandler(a.Router)
	a.Handler.RegisterStatic(a.Router)
	a.Handler.RegisterAPI(a.Router)

	// Добавляем базовые маршруты без авторизации для тестирования
	a.Router.POST("/login", a.Login)
	a.Router.POST("/sign_up", a.Register)
	a.Router.GET("/ping", a.Ping)

	// Для production используем PORT из переменных окружения (Railway, Render и т.д.)
	port := a.Config.ServicePort
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
			logrus.Infof("Using PORT from environment: %d", port)
		}
	}

	// Для production используем 0.0.0.0 чтобы принимать запросы извне
	host := a.Config.ServiceHost
	if host == "localhost" && os.Getenv("PORT") != "" {
		host = "0.0.0.0"
		logrus.Infof("Using 0.0.0.0 for production deployment")
	}

	serverAddress := fmt.Sprintf("%s:%d", host, port)

	// Пытаемся загрузить HTTPS сертификаты (созданные через mkcert)
	certPath := getEnvOrDefault("HTTPS_CERT_PATH", "cert.crt")
	keyPath := getEnvOrDefault("HTTPS_KEY_PATH", "cert.key")

	// Проверяем наличие сертификатов в разных местах
	certPaths := []string{
		certPath,
		filepath.Join(".", certPath),
		filepath.Join("..", certPath),
		filepath.Join("cmd", "GaseProject", certPath),
	}

	keyPaths := []string{
		keyPath,
		filepath.Join(".", keyPath),
		filepath.Join("..", keyPath),
		filepath.Join("cmd", "GaseProject", keyPath),
	}

	var certFile, keyFile string
	for _, cp := range certPaths {
		if _, err := os.Stat(cp); err == nil {
			certFile = cp
			break
		}
	}
	for _, kp := range keyPaths {
		if _, err := os.Stat(kp); err == nil {
			keyFile = kp
			break
		}
	}

	// Если найдены оба файла сертификата, запускаем HTTPS сервер
	if certFile != "" && keyFile != "" {
		logrus.Infof("HTTPS certificates found: cert=%s, key=%s", certFile, keyFile)

		// Загружаем сертификат
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			logrus.Fatalf("Failed to load HTTPS certificates: %v", err)
		}

		// Настраиваем TLS конфигурацию
		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{cert},
			MinVersion:   tls.VersionTLS12,
		}

		// Создаем HTTP сервер с TLS
		server := &http.Server{
			Addr:      serverAddress,
			Handler:   a.Router,
			TLSConfig: tlsConfig,
		}

		logrus.Infof("🚀 Starting HTTPS server on https://%s", serverAddress)
		logrus.Infof("📝 Server is running on HTTPS protocol")

		// Определяем локальный IP адрес для удобства
		if localIP := getLocalIP(); localIP != "" {
			logrus.Infof("💡 Use this URL in frontend: https://%s:%d", localIP, port)
			logrus.Infof("💡 Or use meta tag: <meta name=\"api-url\" content=\"https://%s:%d\" />", localIP, port)
		}

		// Запускаем HTTPS сервер
		if err := server.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			logrus.Fatalf("Failed to start HTTPS server: %v", err)
		}
	} else {
		// Если сертификаты не найдены, запускаем обычный HTTP сервер
		logrus.Infof("HTTPS certificates not found, starting HTTP server")
		logrus.Infof("💡 To enable HTTPS, create certificates using mkcert:")
		logrus.Infof("   1. Install mkcert: npm install -g mkcert")
		logrus.Infof("   2. Create CA: mkcert create-ca")
		logrus.Infof("   3. Create cert: mkcert create-cert")
		logrus.Infof("   4. Place cert.crt and cert.key in project root")
		logrus.Infof("🚀 Starting HTTP server on http://%s", serverAddress)
		logrus.Infof("📝 Server is running on HTTP protocol")

		if err := a.Router.Run(serverAddress); err != nil {
			logrus.Fatal(err)
		}
	}

	logrus.Info("Server down")
}

// getEnvOrDefault возвращает значение переменной окружения или значение по умолчанию
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getLocalIP возвращает локальный IP адрес машины
func getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// loginReq represents login request parameters
// @Description Login credentials
type loginReq struct {
	Login    string `json:"login" example:"testuser"`
	Password string `json:"password" example:"password123"`
}

// loginResp represents login response
// @Description Login response with JWT token
type loginResp struct {
	ExpiresIn   int64  `json:"expires_in" example:"86400"` // 24 hours in seconds
	AccessToken string `json:"access_token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	TokenType   string `json:"token_type" example:"Bearer"`
}

// registerReq represents registration request parameters
// @Description User registration data
type registerReq struct {
	Name  string `json:"name" example:"John Doe"`
	Pass  string `json:"pass" example:"securepassword"`
	Email string `json:"email" example:"john@example.com"`
}

// registerResp represents registration response
// @Description Registration response
type registerResp struct {
	Ok bool `json:"ok" example:"true"`
}

// pingResp represents ping response
// @Description Ping response
type pingResp struct {
	Status string `json:"status" example:"pong"`
}

// Login godoc
// @Summary User login
// @Description Authenticate user and return JWT token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body loginReq true "Login credentials"
// @Success 200 {object} loginResp
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /login [post]
func (a *Application) Login(ctx *gin.Context) {
	req := &loginReq{}

	err := json.NewDecoder(ctx.Request.Body).Decode(req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Получаем пользователя из базы данных
	user, err := a.Repository.GetUserByLogin(req.Login)
	if err != nil {
		logrus.WithError(err).Warn("User not found")
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Invalid credentials"})
		return
	}

	// Проверяем пароль
	err = a.Repository.VerifyPassword(user.Password, req.Password)
	if err != nil {
		logrus.WithError(err).Warn("Invalid password")
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Invalid credentials"})
		return
	}
	// Генерируем JWT токен
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &ds.JWTClaims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
			IssuedAt:  time.Now().Unix(),
		},
		UserID:      user.ID,
		IsModerator: user.IsModerator,
	})

	tokenString, err := token.SignedString([]byte(a.Config.JWT.Secret))
	if err != nil {
		logrus.WithError(err).Error("Failed to sign token")
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	ctx.JSON(http.StatusOK, loginResp{
		ExpiresIn:   24 * 3600, // 24 часа в секундах
		AccessToken: tokenString,
		TokenType:   "Bearer",
	})
}

// Register godoc
// @Summary User registration
// @Description Register a new user
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body registerReq true "Registration data"
// @Success 200 {object} registerResp
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /sign_up [post]
func (a *Application) Register(ctx *gin.Context) {
	req := &registerReq{}

	err := json.NewDecoder(ctx.Request.Body).Decode(req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Pass == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	if req.Name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	// Генерируем хеш пароля
	hashedPassword, err := a.Repository.GenerateHashString(req.Pass)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Создаем пользователя
	user := &ds.User{
		Login:       req.Name, // используем имя как логин для простоты
		Password:    hashedPassword,
		IsModerator: false,
	}

	err = a.Repository.Register(user)
	if err != nil {
		logrus.Errorf("Registration failed: %v", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	logrus.Infof("User registered successfully: %s", req.Name)

	ctx.JSON(http.StatusOK, &registerResp{
		Ok: true,
	})
}

// Ping godoc
// @Summary Ping endpoint
// @Description Check if server is running
// @Tags Tests
// @Produce json
// @Success 200 {object} pingResp
// @Router /ping [get]
func (a *Application) Ping(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, pingResp{
		Status: "pong",
	})
}

// GetAuthClaims helper функция для получения JWT claims из контекста
func (a *Application) GetAuthClaims(ctx *gin.Context) (*ds.JWTClaims, bool) {
	claims, exists := ctx.Get("jwt_claims")
	if !exists {
		return nil, false
	}
	return claims.(*ds.JWTClaims), true
}

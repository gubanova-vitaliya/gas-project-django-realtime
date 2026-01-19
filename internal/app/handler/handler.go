package handler

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/repository"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/sirupsen/logrus"
)

type Handler struct {
	Repository *repository.Repository
}

func NewHandler(r *repository.Repository) *Handler {
	return &Handler{
		Repository: r,
	}
}

// errorHandler для более удобного вывода ошибок
func (h *Handler) errorHandler(ctx *gin.Context, errorStatusCode int, err error) {
	logrus.Error(err.Error())
	ctx.JSON(errorStatusCode, gin.H{
		"status":      "error",
		"description": err.Error(),
	})
}

// RegisterHandler Функция, в которой мы отдельно регистрируем маршруты
func (h *Handler) RegisterHandler(router *gin.Engine) {
	// Базовые алиасы, чтобы / и /gases не отдавали 404
	router.GET("/", h.GetAllGases)
	router.GET("/gases", h.GetAllGases)

	// 1. GET-запрос на просмотр всех карточек на главной странице
	router.GET("/gas", h.GetAllGases)

	// 2. GET-запрос на просмотр одной карточки
	router.GET("/gas/:id", h.GetGasById)

	// 3. GET-запрос на просмотр текущего давления сосуда в журнале
	router.GET("/journal", h.GetJournal)

	// 4. POST-запрос на добавление давления сосуда в журнал
	router.POST("/calculation/add", h.AddGasToVesselPressure)

	// 5. POST-запрос на логическое удаление давления сосуда из журнала
	router.POST("/calculation/:id/remove", h.RemoveGasFromVesselPressure)

	// 6. Новые маршруты для работы с давлениями сосудов
	router.POST("/calculation/:id/calculate", h.CalculateGasPressure)
	router.POST("/calculation/:id/update", h.UpdateGasParams)
	router.POST("/calculation/calculate-all", h.CalculateAllGases)
	router.POST("/calculation/update-all", h.UpdateAllGasParams)
	router.POST("/calculation/save-all", h.SaveAllGasParams)
	router.POST("/calculation/:id/submit", h.SubmitVesselPressure)
}

// findProjectRoot ищет корень проекта, проверяя наличие папки templates
func findProjectRoot() string {
	// Получаем текущую рабочую директорию
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}

	// Проверяем возможные пути к корню проекта
	paths := []string{
		wd,                         // текущая директория
		filepath.Join(wd, ".."),    // на уровень выше
		filepath.Join(wd, "../.."), // на два уровня выше
	}

	for _, path := range paths {
		templatesPath := filepath.Join(path, "templates")
		if _, err := os.Stat(templatesPath); err == nil {
			return path
		}
	}

	// Если не нашли, возвращаем текущую директорию
	return wd
}

// RegisterStatic То же самое, что и с маршрутами, регистрируем статику
func (h *Handler) RegisterStatic(router *gin.Engine) {
	root := findProjectRoot()
	templatesPath := filepath.Join(root, "templates", "*.html")
	resourcesPath := filepath.Join(root, "resources")
	imagesPath := filepath.Join(root, "resources", "images")

	// Загружаем шаблоны (LoadHTMLGlob не возвращает ошибку, паникует если не найдено)
	router.LoadHTMLGlob(templatesPath)

	// Регистрируем статические файлы
	if _, err := os.Stat(resourcesPath); err == nil {
		router.Static("/static", resourcesPath)
	}
	if _, err := os.Stat(imagesPath); err == nil {
		router.Static("/images", imagesPath)
	}
}

// RegisterAPI регистрирует REST API с префиксом /api
func (h *Handler) RegisterAPI(router *gin.Engine) {
	api := router.Group("/api")

	// Публичные эндпоинты
	api.GET("/gases", h.ApiGetGases)
	api.GET("/gases/:id", h.ApiGetGas)
	api.GET("/minio/*path", h.ProxyMinIOImage) // Проксирование изображений MinIO
	api.POST("/auth/register", h.ApiRegister)
	api.POST("/auth/login", h.ApiLogin)

	// Эндпоинты с опциональной аутентификацией (используют токен если есть)
	optionalAuth := api.Group("")
	optionalAuth.Use(h.AuthMiddleware()) // Пытается получить токен, но не требует его
	{
		optionalAuth.GET("/cart", h.ApiGetCart)
	}

	// Эндпоинт для асинхронного сервиса (без JWT, с проверкой auth_token в теле запроса)
	asyncService := api.Group("")
	{
		asyncService.PUT("/mm/gas/:id/result", h.ApiMMUpdateResult)
	}

	// Модераторские эндпоинты для управления газами
	moderatorGas := api.Group("")
	moderatorGas.Use(h.AuthMiddleware())
	moderatorGas.Use(h.ModeratorMiddleware())
	{
		moderatorGas.POST("/gases", h.ApiCreateGas)
		moderatorGas.PUT("/gases/:id", h.ApiUpdateGas)
		moderatorGas.DELETE("/gases/:id", h.ApiDeleteGas)
		moderatorGas.POST("/gases/:id/image", h.ApiUploadGasImage)
	}

	// Защищенные эндпоинты (требуют авторизации)
	protected := api.Group("")
	protected.Use(h.AuthMiddleware())
	protected.Use(h.RequireAuthMiddleware()) // Требует обязательной аутентификации
	{
		protected.GET("/users/me", h.ApiGetProfile)
		protected.PUT("/users/me", h.ApiUpdateMe)
		protected.POST("/auth/logout", h.ApiLogout)

		// Заявки пользователя
		protected.GET("/my-vessel-pressures", h.ApiGetMyVesselPressures)
		protected.GET("/my-draft", h.ApiGetMyDraft)   // Получить последний черновик
		protected.GET("/my-drafts", h.ApiGetMyDrafts) // Получить ВСЕ черновики
		protected.GET("/vessel-pressures/:id", h.ApiGetCalculation)
		protected.POST("/vessel-pressures", h.ApiCreateVesselPressure)
		protected.PUT("/vessel-pressures/:id", h.ApiUpdateVesselPressure)
		protected.DELETE("/vessel-pressures/:id", h.ApiDeleteVesselPressure)
		protected.POST("/vessel-pressures/:id/submit", h.ApiSubmitCalculation)
		protected.POST("/gases/:id/add-to-draft", h.ApiAddGasToDraft)
		protected.PUT("/vessel-pressures/:id/complete", h.ApiCompleteVesselPressure)

		// Управление газами в давлении сосуда (GasVesselPressure)
		protected.DELETE("/mm/gas/:id", h.ApiMMDelete)
		protected.PUT("/mm/gas/:id", h.ApiMMUpdate)
	}

	// Модераторские эндпоинты
	moderator := api.Group("")
	moderator.Use(h.AuthMiddleware())
	moderator.Use(h.ModeratorMiddleware())
	{
		moderator.GET("/vessel-pressures", h.ApiListVesselPressures)
		moderator.POST("/vessel-pressures/:id/calculate", h.ApiCalculateVesselPressure)
		moderator.PUT("/vessel-pressures/:id/reject", h.ApiRejectVesselPressure)
		moderator.GET("/users", h.ApiGetAllUsers)
		moderator.DELETE("/users/:id", h.ApiDeleteUser)
		moderator.PUT("/users/:id/moderator", h.ApiUpdateUserModeratorStatus)
	}
}

// AuthMiddleware middleware для проверки JWT
func (h *Handler) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var tokenString string

		// Сначала пытаемся получить токен из заголовка Authorization
		authHeader := ctx.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// Если токена нет в заголовке, пытаемся получить из куки
		if tokenString == "" {
			if cookie, err := ctx.Cookie("jwt_token"); err == nil {
				tokenString = cookie
			}
		}

		// Если токен найден, пытаемся его распарсить
		if tokenString != "" {
			claims := &ds.JWTClaims{}

			// Парсим без строгой проверки (для тестирования)
			parser := jwt.Parser{
				SkipClaimsValidation: true, // Пропускаем проверку времени
			}
			token, err := parser.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return []byte("test"), nil
			})

			if err == nil && token != nil {
				// Проверяем валидность токена
				if token.Valid {
					// Если токен валиден, сохраняем claims
					ctx.Set("jwt_claims", claims)
					ctx.Set("user_id", claims.UserID)
					ctx.Set("is_moderator", claims.IsModerator)
				}
			}
		}

		// Если нет валидного токена, не устанавливаем заглушечные данные
		// Это позволит защищенным эндпоинтам вернуть ошибку авторизации

		ctx.Next()
	}
}

// -------- Users Handlers --------

type apiRegisterReq struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type apiLoginReq struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type apiUpdateMeReq struct {
	Login *string `json:"login"`
}

type userResp struct {
	ID          uint   `json:"id"`
	Login       string `json:"login"`
	IsModerator bool   `json:"is_moderator"`
}

type updateModeratorRequest struct {
	IsModerator bool `json:"is_moderator" binding:"required"`
}

// ApiRegister godoc
// @Summary Register a new user
// @Description Create a new user account
// @Tags Users
// @Accept json
// @Produce json
// @Param request body apiRegisterReq true "Registration data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/auth/register [post]
func (h *Handler) ApiRegister(ctx *gin.Context) {
	var req apiRegisterReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Генерируем хеш пароля
	hashedPassword, err := h.Repository.GenerateHashString(req.Password)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	user := &ds.User{
		Login:    req.Login,
		Password: hashedPassword,
		IsModerator: false, // По умолчанию обычный пользователь
	}

	err = h.Repository.Register(user)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": userResp{
			ID:          user.ID,
			Login:       user.Login,
			IsModerator: user.IsModerator,
		},
	})
}

// ApiGetProfile godoc
// @Summary Get user profile
// @Description Get current user profile information
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} userResp
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/users/me [get]
func (h *Handler) ApiGetProfile(ctx *gin.Context) {
	userID, exists := ctx.Get("user_id")
	if !exists {
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("user not authenticated"))
		return
	}

	user, err := h.Repository.GetUserByID(userID.(uint))
	if err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	ctx.JSON(http.StatusOK, userResp{
		ID:          user.ID,
		Login:       user.Login,
		IsModerator: user.IsModerator,
	})
}

// ApiLogout godoc
// @Summary User logout
// @Description Logout current user
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Success 204
// @Router /api/auth/logout [post]
func (h *Handler) ApiLogout(ctx *gin.Context) {
	// Очищаем куки
	ctx.SetCookie("jwt_token", "", -1, "/", "", false, true)

	h.Repository.UserLogout()
	ctx.Status(204)
}

// ApiUpdateMe godoc
// @Summary Update user profile
// @Description Update current user information
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body apiUpdateMeReq true "Update data"
// @Success 204
// @Failure 400 {object} map[string]string
// @Router /api/users/me [put]
func (h *Handler) ApiUpdateMe(ctx *gin.Context) {
	var req apiUpdateMeReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, 400, err)
		return
	}
	if err := h.Repository.UserUpdateMe(req.Login); err != nil {
		h.errorHandler(ctx, 400, err)
		return
	}
	ctx.Status(204)
}

// ApiLoginWithSession godoc
// @Summary User login with session
// @Description Authenticate user with session (not implemented)
// @Tags Users
// @Accept json
// @Produce json
// @Param request body apiLoginReq true "Login credentials"
// @Success 501 {object} map[string]string
// @Router /api/auth/login-session [post]
func (h *Handler) ApiLoginWithSession(ctx *gin.Context) {
	// TODO: реализовать логику сессии
	ctx.JSON(http.StatusNotImplemented, gin.H{
		"error": "Session login not implemented yet",
	})
}

// ApiGetAllUsers godoc
// @Summary Get all users
// @Description Get list of all users (Admin/Moderator only)
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Success 200 {array} userResp
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/users [get]
func (h *Handler) ApiGetAllUsers(ctx *gin.Context) {
	users, err := h.Repository.GetAllUsers()
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Преобразуем в response формат
	var resp []userResp
	for _, user := range users {
		resp = append(resp, userResp{
			ID:          user.ID,
			Login:       user.Login,
			IsModerator: user.IsModerator,
		})
	}

	ctx.JSON(http.StatusOK, resp)
}

// ApiDeleteUser godoc
// @Summary Delete user
// @Description Delete user by ID (Moderator only)
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/users/{id} [delete]
func (h *Handler) ApiDeleteUser(ctx *gin.Context) {
	userIDStr := ctx.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, errors.New("invalid user ID"))
		return
	}

	if err := h.Repository.DeleteUser(uint(userID)); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// ApiUpdateUserModeratorStatus godoc
// @Summary Update user moderator status
// @Description Update user moderator status by ID (Moderator only)
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param request body updateModeratorRequest true "New moderator status"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/users/{id}/moderator [put]
func (h *Handler) ApiUpdateUserModeratorStatus(ctx *gin.Context) {
	userIDStr := ctx.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, errors.New("invalid user ID"))
		return
	}

	var req updateModeratorRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	if err := h.Repository.UpdateUserModeratorStatus(uint(userID), req.IsModerator); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

type apiLoginResp struct {
	AccessToken string   `json:"access_token"`
	TokenType   string   `json:"token_type"`
	ExpiresIn   int64    `json:"expires_in"`
	User        userResp `json:"user"`
}

// ApiLogin godoc
// @Summary User login
// @Description Authenticate user and return JWT token
// @Tags Users
// @Accept json
// @Produce json
// @Param request body apiLoginReq true "Login credentials"
// @Success 200 {object} apiLoginResp
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/auth/login [post]
func (h *Handler) ApiLogin(ctx *gin.Context) {
	var req apiLoginReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logrus.Errorf("Login request binding error: %v", err)
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	logrus.Infof("Login attempt for user: %s", req.Login)
	user, err := h.Repository.AuthenticateUser(req.Login, req.Password)
	if err != nil {
		logrus.Warnf("Authentication failed for user %s: %v", req.Login, err)
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	logrus.Infof("User %s authenticated successfully, ID: %d, IsModerator: %v", user.Login, user.ID, user.IsModerator)

	// Генерируем JWT токен
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &ds.JWTClaims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
			IssuedAt:  time.Now().Unix(),
		},
		UserID:      user.ID,
		IsModerator: user.IsModerator,
	})

	tokenString, err := token.SignedString([]byte("test")) // используйте секрет из конфига
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Устанавливаем куки
	ctx.SetCookie("jwt_token", tokenString, 3600*24, "/", "", false, true)

	ctx.JSON(http.StatusOK, apiLoginResp{
		AccessToken: tokenString,
		TokenType:   "Bearer",
		ExpiresIn:   24 * 3600,
		User: userResp{
			ID:          user.ID,
			Login:       user.Login,
			IsModerator: user.IsModerator,
		},
	})
}

// RequireAuthMiddleware middleware для обязательной проверки аутентификации
func (h *Handler) RequireAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		logrus.Infof("RequireAuthMiddleware: checking auth for %s %s", ctx.Request.Method, ctx.Request.URL.Path)
		
		userID, exists := ctx.Get("user_id")
		if !exists || userID == nil {
			logrus.Warnf("Unauthorized access attempt to %s %s - user_id not found in context", ctx.Request.Method, ctx.Request.URL.Path)
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			ctx.Abort()
			return
		}
		
		logrus.Infof("RequireAuthMiddleware: user_id found: %v (type: %T)", userID, userID)
		
		// Проверяем, что userID валиден
		var uid uint
		switch v := userID.(type) {
		case uint:
			uid = v
		case int:
			uid = uint(v)
		case int64:
			uid = uint(v)
		case float64:
			uid = uint(v)
		default:
			logrus.Warnf("Invalid user ID type for %s %s: %T, value: %v", ctx.Request.Method, ctx.Request.URL.Path, userID, userID)
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user ID"})
			ctx.Abort()
			return
		}
		
		if uid == 0 {
			logrus.Warnf("Zero user ID for %s %s", ctx.Request.Method, ctx.Request.URL.Path)
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user ID"})
			ctx.Abort()
			return
		}
		
		logrus.Infof("RequireAuthMiddleware: auth successful for user %d", uid)
		ctx.Next()
	}
}

// ModeratorMiddleware middleware для проверки прав модератора
func (h *Handler) ModeratorMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		isModerator, exists := ctx.Get("is_moderator")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication not found"})
			ctx.Abort()
			return
		}

		moderatorStatus, ok := isModerator.(bool)
		if !ok {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Invalid moderator status"})
			ctx.Abort()
			return
		}

		if !moderatorStatus {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions. Moderator access required."})
			ctx.Abort()
			return
		}

		ctx.Next()
	}
}

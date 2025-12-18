package handler

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/repository"
	"WEB/internal/app/role"
	"errors"
	"net/http"
	"os"
	"path/filepath"
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

	// 3. GET-запрос на просмотр текущего расчета в журнале
	router.GET("/journal", h.GetJournal)

	// 4. POST-запрос на добавление расчета в журнал
	router.POST("/calculation/add", h.AddGasToCalculation)

	// 5. POST-запрос на логическое удаление расчета из журнала
	router.POST("/calculation/:id/remove", h.RemoveGasFromCalculation)

	// 6. Новые маршруты для работы с расчетами
	router.POST("/calculation/:id/calculate", h.CalculateGasPressure)
	router.POST("/calculation/:id/update", h.UpdateGasParams)
	router.POST("/calculation/calculate-all", h.CalculateAllGases)
	router.POST("/calculation/update-all", h.UpdateAllGasParams)
	router.POST("/calculation/save-all", h.SaveAllGasParams)
	router.POST("/calculation/:id/submit", h.SubmitCalculation)
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
		optionalAuth.POST("/gases/:id/add-to-draft", h.ApiAddGasToDraft)
	}

	// Админские эндпоинты для управления газами
	adminGas := api.Group("")
	adminGas.Use(h.AuthMiddleware())
	adminGas.Use(h.RoleMiddleware(role.Admin))
	{
		adminGas.POST("/gases", h.ApiCreateGas)
		adminGas.PUT("/gases/:id", h.ApiUpdateGas)
		adminGas.DELETE("/gases/:id", h.ApiDeleteGas)
		adminGas.POST("/gases/:id/image", h.ApiUploadGasImage)
	}

	// Защищенные эндпоинты (требуют авторизации)
	protected := api.Group("")
	protected.Use(h.AuthMiddleware())
	{
		protected.GET("/users/me", h.ApiGetProfile)
		protected.PUT("/users/me", h.ApiUpdateMe)
		protected.POST("/auth/logout", h.ApiLogout)

		// Заявки пользователя
		protected.GET("/my-calculations", h.ApiGetMyCalculations)
		protected.GET("/my-draft", h.ApiGetMyDraft) // Получить черновик как заявку
		protected.GET("/calculations/:id", h.ApiGetCalculation)
		protected.POST("/calculations", h.ApiCreateCalculation)
		protected.PUT("/calculations/:id", h.ApiUpdateCalculation)
		protected.DELETE("/calculations/:id", h.ApiDeleteCalculation)
		protected.POST("/calculations/:id/submit", h.ApiSubmitCalculation)
		protected.PUT("/calculations/:id/complete", h.ApiCompleteCalculation)
		
		// Управление газами в расчетах (GasCalculation)
		protected.DELETE("/mm/gas/:id", h.ApiMMDelete)
		protected.PUT("/mm/gas/:id", h.ApiMMUpdate)
	}

	// Модераторские эндпоинты
	moderator := api.Group("")
	moderator.Use(h.AuthMiddleware())
	moderator.Use(h.RoleMiddleware(role.Manager, role.Admin))
	{
		moderator.GET("/calculations", h.ApiListCalculations)
		// moderator.PUT("/calculations/:id/complete", h.ApiCompleteCalculation)  // <-- УДАЛИЛИ ОТСЮДА
		moderator.PUT("/calculations/:id/reject", h.ApiRejectCalculation)
		moderator.GET("/users", h.ApiGetAllUsers)
	}

	// Админские эндпоинты
	admin := api.Group("")
	admin.Use(h.AuthMiddleware())
	admin.Use(h.RoleMiddleware(role.Admin))
	{
		admin.DELETE("/users/:uuid", h.ApiDeleteUser)
		admin.PUT("/users/:uuid/role", h.ApiUpdateUserRole)
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
				// Если токен валиден, сохраняем claims
				ctx.Set("jwt_claims", claims)
				ctx.Set("user_uuid", claims.UserUUID.String())
				ctx.Set("user_role", claims.Role)
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
	Email    string `json:"email,omitempty"`
	Name     string `json:"name" binding:"required"`
}

type apiLoginReq struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type apiUpdateMeReq struct {
	Login *string `json:"login"`
}

type userResp struct {
	UUID  string `json:"uuid"`
	Name  string `json:"name"`
	Login string `json:"login"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type updateRoleRequest struct {
	Role string `json:"role" binding:"required"`
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
		Name:     req.Name,
		Login:    req.Login,
		Email:    req.Email,
		Role:     role.Buyer.String(), // Преобразуем в string
		Password: hashedPassword,
	}

	err = h.Repository.Register(user)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": userResp{
			UUID:  user.UUID.String(),
			Name:  user.Name,
			Login: user.Login,
			Email: user.Email,
			Role:  user.Role, // Уже string, не нужно .String()
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
	userUUID, exists := ctx.Get("user_uuid")
	if !exists {
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("user not authenticated"))
		return
	}

	user, err := h.Repository.GetUserByUUID(userUUID.(string))
	if err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	ctx.JSON(http.StatusOK, userResp{
		UUID:  user.UUID.String(),
		Name:  user.Name,
		Login: user.Login,
		Email: user.Email,
		Role:  user.Role, // Уже string, не нужно .String()
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
			UUID:  user.UUID.String(),
			Name:  user.Name,
			Login: user.Login,
			Email: user.Email,
			Role:  user.Role, // Уже string, не нужно .String()
		})
	}

	ctx.JSON(http.StatusOK, resp)
}

// ApiDeleteUser godoc
// @Summary Delete user
// @Description Delete user by UUID (Admin only)
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Param uuid path string true "User UUID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/users/{uuid} [delete]
func (h *Handler) ApiDeleteUser(ctx *gin.Context) {
	userUUID := ctx.Param("uuid")
	if userUUID == "" {
		h.errorHandler(ctx, http.StatusBadRequest, errors.New("user UUID is required"))
		return
	}

	if err := h.Repository.DeleteUser(userUUID); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// ApiUpdateUserRole godoc
// @Summary Update user role
// @Description Update user role by UUID (Admin only)
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param uuid path string true "User UUID"
// @Param request body updateRoleRequest true "New role"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/users/{uuid}/role [put]
func (h *Handler) ApiUpdateUserRole(ctx *gin.Context) {
	userUUID := ctx.Param("uuid")
	if userUUID == "" {
		h.errorHandler(ctx, http.StatusBadRequest, errors.New("user UUID is required"))
		return
	}

	var req updateRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	newRole := role.FromString(req.Role)
	if err := h.Repository.UpdateUserRole(userUUID, newRole); err != nil {
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
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	user, err := h.Repository.AuthenticateUser(req.Login, req.Password)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Преобразуем строковую роль обратно в тип Role для JWT
	userRole := role.FromString(user.Role)

	// Генерируем JWT токен
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &ds.JWTClaims{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
			IssuedAt:  time.Now().Unix(),
		},
		UserUUID: user.UUID,
		Role:     userRole, // Используем преобразованную роль
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
			UUID:  user.UUID.String(),
			Name:  user.Name,
			Login: user.Login,
			Email: user.Email,
			Role:  user.Role, // Уже string, не нужно .String()
		},
	})
}

// RoleMiddleware middleware для проверки ролей
func (h *Handler) RoleMiddleware(allowedRoles ...role.Role) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userRole, exists := ctx.Get("user_role")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			ctx.Abort()
			return
		}

		hasAccess := false
		for _, allowedRole := range allowedRoles {
			if userRole.(role.Role) == allowedRole {
				hasAccess = true
				break
			}
		}

		if !hasAccess {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			ctx.Abort()
			return
		}

		ctx.Next()
	}
}

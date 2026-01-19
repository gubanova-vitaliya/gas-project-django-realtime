package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// getCreatorIDFromContext получает ID пользователя (creatorID) из контекста JWT
// Возвращает ошибку, если пользователь не авторизован
func (h *Handler) getCreatorIDFromContext(ctx *gin.Context) (uint, error) {
	// Пытаемся получить ID пользователя из контекста
	userIDInterface, exists := ctx.Get("user_id")
	if !exists || userIDInterface == nil {
		logrus.Warnf("getCreatorIDFromContext: user_id not found in context for path %s", ctx.Request.URL.Path)
		return 0, errors.New("user not authenticated")
	}

	logrus.Infof("getCreatorIDFromContext: user_id found: %v (type: %T)", userIDInterface, userIDInterface)

	var userID uint
	// Попытка преобразовать из разных типов
		switch v := userIDInterface.(type) {
	case uint:
		userID = v
		case int:
			userID = uint(v)
		case int64:
		userID = uint(v)
	case float64:
			userID = uint(v)
		default:
		logrus.Errorf("getCreatorIDFromContext: invalid user ID type: %T, value: %v", userIDInterface, userIDInterface)
			return 0, errors.New("invalid user ID in token")
	}

	if userID == 0 {
		logrus.Warnf("getCreatorIDFromContext: user ID is zero")
		return 0, errors.New("invalid user ID in token")
	}

	logrus.Infof("getCreatorIDFromContext: returning userID=%d", userID)
	return userID, nil
}

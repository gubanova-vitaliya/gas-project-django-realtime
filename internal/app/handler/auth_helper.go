package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
)

// getCreatorIDFromContext получает ID пользователя (creatorID) из контекста JWT
// Возвращает ошибку, если пользователь не авторизован
func (h *Handler) getCreatorIDFromContext(ctx *gin.Context) (uint, error) {
	// Пытаемся получить UUID пользователя из контекста
	userUUIDInterface, exists := ctx.Get("user_uuid")
	if !exists || userUUIDInterface == nil {
		return 0, errors.New("user not authenticated")
	}

	userUUID, ok := userUUIDInterface.(string)
	if !ok || userUUID == "" {
		return 0, errors.New("invalid user UUID in token")
	}

	// Получаем пользователя по UUID
	user, err := h.Repository.GetUserByUUID(userUUID)
	if err != nil {
		return 0, err
	}

	if user == nil {
		return 0, errors.New("user not found")
	}

	return user.ID, nil
}


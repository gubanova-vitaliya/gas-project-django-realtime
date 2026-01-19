package pkg

import (
	"net/http"
	"strings"

	"WEB/internal/app/ds"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/sirupsen/logrus"
)

const jwtPrefix = "Bearer "

// SimpleAuthMiddleware упрощенный middleware для тестирования
func (a *Application) SimpleAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			ctx.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, jwtPrefix) {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			ctx.Abort()
			return
		}

		tokenString := authHeader[len(jwtPrefix):]

		// Парсим JWT токен
		token, err := jwt.ParseWithClaims(tokenString, &ds.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(a.Config.JWT.Secret), nil
		})
		if err != nil || !token.Valid {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			ctx.Abort()
			return
		}

		claims, ok := token.Claims.(*ds.JWTClaims)
		if !ok {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			ctx.Abort()
			return
		}

		// Сохраняем claims в контекст
		ctx.Set("jwt_claims", claims)
		ctx.Set("user_id", claims.UserID)
		ctx.Set("is_moderator", claims.IsModerator)

		logrus.Debugf("User ID %d authenticated, IsModerator: %v", claims.UserID, claims.IsModerator)
		ctx.Next()
	}
}

// ModeratorMiddleware middleware для проверки прав модератора
func (a *Application) ModeratorMiddleware() gin.HandlerFunc {
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

package pkg

import (
	"net/http"
	"strings"

	"WEB/internal/app/ds"
	"WEB/internal/app/role"

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
		ctx.Set("user_uuid", claims.UserUUID.String())
		ctx.Set("user_role", claims.Role)

		logrus.Debugf("User %s with role %s authenticated", claims.UserUUID, claims.Role)
		ctx.Next()
	}
}

// RoleMiddleware middleware для проверки ролей
func (a *Application) RoleMiddleware(allowedRoles ...role.Role) gin.HandlerFunc {
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

package ds

import (
	"github.com/golang-jwt/jwt"
)

type JWTClaims struct {
	jwt.StandardClaims
	UserID      uint `json:"user_id"`
	IsModerator bool `json:"is_moderator"`
}

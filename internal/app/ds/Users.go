package ds

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UUID      uuid.UUID      `gorm:"type:uuid;uniqueIndex;default:uuid_generate_v4()" json:"uuid"`
	Name      string         `gorm:"type:varchar(100);not null" json:"name"`
	Login     string         `gorm:"type:varchar(50);not null" json:"login"`
	Email     string         `gorm:"type:varchar(100)" json:"email"`
	Role      string         `gorm:"type:varchar(20);not null;default:'buyer'" json:"role"` // ТОЛЬКО string!
	Password  string         `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName задает имя таблицы
func (User) TableName() string {
	return "users"
}

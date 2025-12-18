// internal/app/ds/Calculation.go
package ds

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

type Calculation struct {
	ID     uint           `gorm:"primaryKey"`
	Status string         `gorm:"type:varchar(15);not null;default:'draft'"`
	Text   sql.NullString `gorm:"type:text;default:null"`

	// Три даты как требуется
	DateCreate   time.Time    `gorm:"not null"`     // Дата создания
	DateForm     sql.NullTime `gorm:"default:null"` // Дата формирования (после submit)
	DateComplete sql.NullTime `gorm:"default:null"` // Дата завершения (после complete)

	// Пользователи
	CreatorID   uint  `gorm:"not null"`
	ModeratorID *uint `gorm:"default:null"`

	// Параметры расчета (общие для всего расчета)
	InitialPressure    sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	InitialTemperature sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalTemperature   sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	Volume             sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	GasAmount          sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalPressure      sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`

	// Связи
	Creator   User  `gorm:"foreignKey:CreatorID"`
	Moderator *User `gorm:"foreignKey:ModeratorID"`

	// Газы в расчете
	Gases []GasCalculation `gorm:"foreignKey:CalculationID"`

	DeletedAt gorm.DeletedAt `gorm:"index"`
}

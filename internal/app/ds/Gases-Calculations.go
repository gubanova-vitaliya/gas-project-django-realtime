// internal/app/ds/Gases-Calculations.go
package ds

import "database/sql"

type GasVesselPressure struct {
	ID uint `gorm:"primaryKey"`

	VesselPressureID uint `gorm:"column:calculation_id;not null"`
	GasID         uint `gorm:"not null"`

	Sound    bool `gorm:"default:true"`
	Quantity int  `gorm:"default:1"`
	Position int  `gorm:"default:0"`

	// Параметры давления сосуда для конкретного газа
	InitialPressure    sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	InitialTemperature sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalTemperature   sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	Volume             sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	GasAmount          sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalPressure      sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`

	VesselPressure VesselPressure `gorm:"foreignKey:VesselPressureID"`
	Gas         Gas         `gorm:"foreignKey:GasID"`
}

// TableName задает имя таблицы в базе данных (оставляем старое название "gas_calculations")
func (GasVesselPressure) TableName() string {
	return "gas_calculations"
}

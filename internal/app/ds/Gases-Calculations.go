// internal/app/ds/Gases-Calculations.go
package ds

import "database/sql"

type GasCalculation struct {
	ID uint `gorm:"primaryKey"`

	CalculationID uint `gorm:"not null"`
	GasID         uint `gorm:"not null"`

	Sound    bool `gorm:"default:true"`
	Quantity int  `gorm:"default:1"`
	Position int  `gorm:"default:0"`

	// Параметры расчета для конкретного газа
	InitialPressure    sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	InitialTemperature sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalTemperature   sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	Volume             sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	GasAmount          sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`
	FinalPressure      sql.NullFloat64 `gorm:"type:decimal(10,4);default:null"`

	Calculation Calculation `gorm:"foreignKey:CalculationID"`
	Gas         Gas         `gorm:"foreignKey:GasID"`
}

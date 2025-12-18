package main

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/dsn"
	"WEB/internal/app/role"
	"fmt"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// cmd/migrate/main.go
func main() {
	_ = godotenv.Load()
	db, err := gorm.Open(postgres.Open(dsn.FromEnv()), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Отключаем проверку внешних ключей на время миграции
	db.Exec("SET session_replication_role = 'replica'")

	// Включаем расширение UUID
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

	// Удаляем старые таблицы в правильном порядке (из-за foreign keys)
	db.Migrator().DropTable(&ds.GasCalculation{})
	db.Migrator().DropTable(&ds.Calculation{})
	db.Migrator().DropTable(&ds.Gas{})
	db.Migrator().DropTable(&ds.User{})

	// Migrate the schema
	err = db.AutoMigrate(
		&ds.User{},
		&ds.Gas{},
		&ds.Calculation{},
		&ds.GasCalculation{},
	)
	if err != nil {
		panic("cant migrate db: " + err.Error())
	}

	// Включаем обратно проверку внешних ключей
	db.Exec("SET session_replication_role = 'origin'")

	// Создаем администратора по умолчанию
	createDefaultAdmin(db)

	fmt.Println("Database migrated successfully!")
	fmt.Println("Admin user: login='admin', password='password'")
}

func createDefaultAdmin(db *gorm.DB) {
	var count int64
	db.Model(&ds.User{}).Where("role = ?", role.Admin.String()).Count(&count)

	if count == 0 {
		adminUser := &ds.User{
			Name:     "Administrator",
			Login:    "admin",
			Email:    "admin@gaseproject.com",
			Role:     role.Admin.String(),                                            // Преобразуем в string
			Password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
		}

		if err := db.Create(adminUser).Error; err != nil {
			println("Warning: Failed to create default admin user:", err.Error())
		} else {
			println("Default admin user created: login='admin', password='password'")
		}
	}
}

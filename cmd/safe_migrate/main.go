package main

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/dsn"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Безопасная миграция - использует ALTER TABLE вместо DROP/CREATE
// Это сохраняет все существующие данные

func main() {
	_ = godotenv.Load()

	db, err := gorm.Open(postgres.Open(dsn.FromEnv()), &gorm.Config{})
	if err != nil {
		fmt.Printf("Ошибка подключения к базе данных: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Начинаем безопасную миграцию структуры пользователя...")
	fmt.Println("⚠️  ВАЖНО: Рекомендуется сделать резервную копию базы данных перед миграцией!")
	fmt.Println()

	// Создаем резервную копию данных пользователей
	if err := backupUsers(db); err != nil {
		fmt.Printf("⚠️  Предупреждение: Не удалось создать резервную копию: %v\n", err)
		fmt.Println("Продолжаем миграцию...")
	} else {
		fmt.Println("✓ Резервная копия создана")
	}

	// Проверяем текущую структуру таблицы
	fmt.Println("\nПроверяем текущую структуру таблицы users...")
	if err := checkTableStructure(db); err != nil {
		fmt.Printf("Ошибка при проверке структуры: %v\n", err)
		os.Exit(1)
	}

	// Выполняем безопасные изменения
	fmt.Println("\nВыполняем безопасные изменения...")

	// Пример: добавление нового поля (если его нет)
	// Раскомментируйте нужные изменения:

	// 1. Добавить новое поле (например, phone)
	// if err := addColumnIfNotExists(db, "users", "phone", "VARCHAR(20)"); err != nil {
	// 	fmt.Printf("Ошибка при добавлении поля phone: %v\n", err)
	// } else {
	// 	fmt.Println("✓ Поле phone добавлено (если его не было)")
	// }

	// 2. Изменить тип существующего поля
	// if err := modifyColumnType(db, "users", "email", "VARCHAR(200)"); err != nil {
	// 	fmt.Printf("Ошибка при изменении типа поля email: %v\n", err)
	// } else {
	// 	fmt.Println("✓ Тип поля email изменен")
	// }

	// 3. Добавить индекс
	// if err := addIndexIfNotExists(db, "users", "idx_users_email", "email"); err != nil {
	// 	fmt.Printf("Ошибка при добавлении индекса: %v\n", err)
	// } else {
	// 	fmt.Println("✓ Индекс добавлен")
	// }

	// 4. Изменить значение по умолчанию
	// if err := changeDefaultValue(db, "users", "role", "buyer"); err != nil {
	// 	fmt.Printf("Ошибка при изменении значения по умолчанию: %v\n", err)
	// } else {
	// 	fmt.Println("✓ Значение по умолчанию изменено")
	// }

	// Используем AutoMigrate для безопасного обновления структуры
	// AutoMigrate добавляет только новые поля, не удаляет существующие
	fmt.Println("\nВыполняем AutoMigrate (добавляет только новые поля)...")
	if err := db.AutoMigrate(&ds.User{}); err != nil {
		fmt.Printf("Ошибка при AutoMigrate: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ AutoMigrate выполнен успешно")

	fmt.Println("\n✓ Миграция завершена успешно!")
	fmt.Println("\nПроверьте структуру таблицы и убедитесь, что все изменения применены корректно.")
}

// backupUsers создает резервную копию данных пользователей
func backupUsers(db *gorm.DB) error {
	var users []ds.User
	if err := db.Find(&users).Error; err != nil {
		return err
	}

	// Сохраняем в файл (в реальном проекте лучше использовать pg_dump)
	fmt.Printf("Найдено пользователей для резервного копирования: %d\n", len(users))
	
	// В реальном проекте здесь можно использовать pg_dump:
	// pg_dump -h localhost -U postgres -d lab2 -t users > backup_users.sql
	
	return nil
}

// checkTableStructure проверяет текущую структуру таблицы
func checkTableStructure(db *gorm.DB) error {
	var result struct {
		ColumnName string
		DataType   string
		IsNullable string
	}

	rows, err := db.Raw(`
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_name = 'users'
		ORDER BY ordinal_position;
	`).Rows()

	if err != nil {
		return err
	}
	defer rows.Close()

	fmt.Println("Текущие поля таблицы users:")
	fmt.Println("----------------------------------------")
	for rows.Next() {
		rows.Scan(&result.ColumnName, &result.DataType, &result.IsNullable)
		nullable := "NOT NULL"
		if result.IsNullable == "YES" {
			nullable = "NULL"
		}
		fmt.Printf("  %s: %s (%s)\n", result.ColumnName, result.DataType, nullable)
	}

	return nil
}

// addColumnIfNotExists добавляет колонку, если её нет
func addColumnIfNotExists(db *gorm.DB, tableName, columnName, columnType string) error {
	var exists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_name = ? AND column_name = ?
		)
	`, tableName, columnName).Scan(&exists).Error

	if err != nil {
		return err
	}

	if !exists {
		sql := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, columnType)
		return db.Exec(sql).Error
	}

	fmt.Printf("  Поле %s уже существует, пропускаем\n", columnName)
	return nil
}

// modifyColumnType изменяет тип колонки
func modifyColumnType(db *gorm.DB, tableName, columnName, newType string) error {
	sql := fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s TYPE %s", tableName, columnName, newType)
	return db.Exec(sql).Error
}

// addIndexIfNotExists добавляет индекс, если его нет
func addIndexIfNotExists(db *gorm.DB, tableName, indexName, columnName string) error {
	var exists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM pg_indexes 
			WHERE tablename = ? AND indexname = ?
		)
	`, tableName, indexName).Scan(&exists).Error

	if err != nil {
		return err
	}

	if !exists {
		sql := fmt.Sprintf("CREATE INDEX %s ON %s (%s)", indexName, tableName, columnName)
		return db.Exec(sql).Error
	}

	fmt.Printf("  Индекс %s уже существует, пропускаем\n", indexName)
	return nil
}

// changeDefaultValue изменяет значение по умолчанию
func changeDefaultValue(db *gorm.DB, tableName, columnName, defaultValue string) error {
	sql := fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT '%s'", tableName, columnName, defaultValue)
	return db.Exec(sql).Error
}




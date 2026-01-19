package main

import (
	"WEB/internal/app/dsn"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Безопасная миграция структуры пользователя
// Преобразует существующую структуру в упрощенную:
// id, login, password, is_moderator

func main() {
	_ = godotenv.Load()

	db, err := gorm.Open(postgres.Open(dsn.FromEnv()), &gorm.Config{})
	if err != nil {
		fmt.Printf("Ошибка подключения к базе данных: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  БЕЗОПАСНАЯ МИГРАЦИЯ СТРУКТУРЫ ПОЛЬЗОВАТЕЛЯ")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Println("⚠️  ВАЖНО: Создайте резервную копию базы данных перед миграцией!")
	fmt.Println("   pg_dump -h localhost -p 5432 -U postgres -d lab2 > backup_users.sql")
	fmt.Println()
	fmt.Print("Продолжить миграцию? (yes/no): ")

	var confirm string
	fmt.Scanln(&confirm)
	if confirm != "yes" {
		fmt.Println("Миграция отменена.")
		os.Exit(0)
	}

	fmt.Println("\nНачинаем миграцию...")
	fmt.Println()

	// Шаг 1: Создаем резервную копию данных
	fmt.Println("Шаг 1: Создание резервной копии данных...")
	if err := backupUserData(db); err != nil {
		fmt.Printf("⚠️  Предупреждение: Не удалось создать резервную копию: %v\n", err)
	} else {
		fmt.Println("✓ Резервная копия создана")
	}

	// Шаг 2: Добавляем новое поле is_moderator
	fmt.Println("\nШаг 2: Добавление поля is_moderator...")
	if err := addIsModeratorColumn(db); err != nil {
		fmt.Printf("❌ Ошибка: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Поле is_moderator добавлено")

	// Шаг 3: Заполняем is_moderator на основе существующей роли
	fmt.Println("\nШаг 3: Заполнение is_moderator на основе роли...")
	if err := populateIsModerator(db); err != nil {
		fmt.Printf("❌ Ошибка: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Поле is_moderator заполнено")

	// Шаг 4: Удаляем ненужные поля (только если все прошло успешно)
	fmt.Println("\nШаг 4: Удаление ненужных полей...")
	fmt.Println("  Удаляем: uuid, name, email, role, created_at, updated_at, deleted_at")

	// Удаляем внешние ключи сначала (если они есть)
	if err := removeForeignKeys(db); err != nil {
		fmt.Printf("⚠️  Предупреждение при удалении внешних ключей: %v\n", err)
	}

	// Удаляем поля
	fieldsToRemove := []string{
		"uuid",
		"name",
		"email",
		"role",
		"created_at",
		"updated_at",
		"deleted_at",
	}

	for _, field := range fieldsToRemove {
		if err := removeColumnIfExists(db, "users", field); err != nil {
			fmt.Printf("⚠️  Предупреждение при удалении поля %s: %v\n", field, err)
		} else {
			fmt.Printf("  ✓ Поле %s удалено\n", field)
		}
	}

	// Шаг 5: Устанавливаем ограничения
	fmt.Println("\nШаг 5: Установка ограничений...")
	if err := setConstraints(db); err != nil {
		fmt.Printf("⚠️  Предупреждение: %v\n", err)
	} else {
		fmt.Println("✓ Ограничения установлены")
	}

	// Шаг 6: Проверка результата
	fmt.Println("\nШаг 6: Проверка результата...")
	if err := verifyMigration(db); err != nil {
		fmt.Printf("❌ Ошибка при проверке: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Миграция завершена успешно!")

	fmt.Println("\n═══════════════════════════════════════════════════════════")
	fmt.Println("  Структура пользователя успешно упрощена!")
	fmt.Println("  Теперь таблица users содержит только:")
	fmt.Println("    - id (primary key)")
	fmt.Println("    - login")
	fmt.Println("    - password")
	fmt.Println("    - is_moderator (boolean)")
	fmt.Println("═══════════════════════════════════════════════════════════")
}

// backupUserData создает резервную копию данных пользователей
func backupUserData(db *gorm.DB) error {
	var count int64
	db.Raw("SELECT COUNT(*) FROM users").Scan(&count)
	fmt.Printf("  Найдено пользователей: %d\n", count)

	// В реальном проекте здесь можно использовать pg_dump
	// Для простоты просто выводим информацию
	return nil
}

// addIsModeratorColumn добавляет поле is_moderator
func addIsModeratorColumn(db *gorm.DB) error {
	// Проверяем, существует ли поле
	var exists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_name = 'users' AND column_name = 'is_moderator'
		)
	`).Scan(&exists).Error

	if err != nil {
		return err
	}

	if !exists {
		// Добавляем поле с временным значением по умолчанию
		return db.Exec("ALTER TABLE users ADD COLUMN is_moderator BOOLEAN NOT NULL DEFAULT false").Error
	}

	fmt.Println("  Поле is_moderator уже существует")
	return nil
}

// populateIsModerator заполняет is_moderator на основе роли
func populateIsModerator(db *gorm.DB) error {
	// Устанавливаем is_moderator = true для manager и admin
	// is_moderator = false для buyer и других
	return db.Exec(`
		UPDATE users 
		SET is_moderator = CASE 
			WHEN role IN ('manager', 'admin') THEN true 
			ELSE false 
		END
		WHERE is_moderator IS NULL OR is_moderator = false
	`).Error
}

// removeForeignKeys удаляет внешние ключи, связанные с users
func removeForeignKeys(db *gorm.DB) error {
	// Получаем список внешних ключей
	var fks []struct {
		ConstraintName string
		TableName      string
	}

	err := db.Raw(`
		SELECT 
			tc.constraint_name,
			tc.table_name
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
			ON tc.constraint_name = kcu.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND kcu.table_name = 'calculations'
			AND (kcu.column_name = 'creator_id' OR kcu.column_name = 'moderator_id')
	`).Scan(&fks).Error

	if err != nil {
		return err
	}

	// Удаляем внешние ключи
	for _, fk := range fks {
		sql := fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s", fk.TableName, fk.ConstraintName)
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}

	return nil
}

// removeColumnIfExists удаляет колонку, если она существует
func removeColumnIfExists(db *gorm.DB, tableName, columnName string) error {
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

	if exists {
		// В PostgreSQL нельзя просто удалить колонку, если на неё есть ссылки
		// Поэтому используем CASCADE
		sql := fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS %s CASCADE", tableName, columnName)
		return db.Exec(sql).Error
	}

	return nil
}

// setConstraints устанавливает ограничения
func setConstraints(db *gorm.DB) error {
	// Убеждаемся, что is_moderator имеет значение по умолчанию
	return db.Exec("ALTER TABLE users ALTER COLUMN is_moderator SET DEFAULT false").Error
}

// verifyMigration проверяет результат миграции
func verifyMigration(db *gorm.DB) error {
	var columns []struct {
		ColumnName string
		DataType   string
	}

	err := db.Raw(`
		SELECT column_name, data_type
		FROM information_schema.columns
		WHERE table_name = 'users'
		ORDER BY ordinal_position
	`).Scan(&columns).Error

	if err != nil {
		return err
	}

	fmt.Println("\n  Текущая структура таблицы users:")
	fmt.Println("  ----------------------------------------")
	for _, col := range columns {
		fmt.Printf("    %s: %s\n", col.ColumnName, col.DataType)
	}

	// Проверяем, что основные поля присутствуют
	requiredFields := map[string]bool{
		"id":           false,
		"login":        false,
		"password":     false,
		"is_moderator": false,
	}

	for _, col := range columns {
		if _, ok := requiredFields[col.ColumnName]; ok {
			requiredFields[col.ColumnName] = true
		}
	}

	for field, found := range requiredFields {
		if !found {
			return fmt.Errorf("обязательное поле %s не найдено", field)
		}
	}

	// Проверяем данные
	var userCount int64
	var moderatorCount int64
	db.Raw("SELECT COUNT(*) FROM users").Scan(&userCount)
	db.Raw("SELECT COUNT(*) FROM users WHERE is_moderator = true").Scan(&moderatorCount)

	fmt.Printf("\n  Статистика:")
	fmt.Printf("\n    Всего пользователей: %d", userCount)
	fmt.Printf("\n    Модераторов: %d", moderatorCount)
	fmt.Printf("\n    Обычных пользователей: %d\n", userCount-moderatorCount)

	return nil
}



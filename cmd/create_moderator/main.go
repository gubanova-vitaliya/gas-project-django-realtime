package main

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/dsn"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Загружаем переменные окружения
	_ = godotenv.Load()

	// Подключаемся к базе данных
	db, err := gorm.Open(postgres.Open(dsn.FromEnv()), &gorm.Config{})
	if err != nil {
		fmt.Printf("Ошибка подключения к базе данных: %v\n", err)
		os.Exit(1)
	}

	// Получаем параметры из аргументов командной строки или используем значения по умолчанию
	login := "moderator"
	password := "moderator"

	if len(os.Args) > 1 {
		login = os.Args[1]
	}
	if len(os.Args) > 2 {
		password = os.Args[2]
	}

	// Проверяем, существует ли пользователь с таким логином
	var existingUser ds.User
	result := db.Where("login = ?", login).First(&existingUser)

	if result.Error == nil {
		// Пользователь существует - обновляем его роль и пароль
		fmt.Printf("Пользователь с логином '%s' уже существует. Обновляем is_moderator и пароль...\n", login)

		// Хешируем пароль
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			fmt.Printf("Ошибка хеширования пароля: %v\n", err)
			os.Exit(1)
		}

		// Обновляем пользователя
		updates := map[string]interface{}{
			"is_moderator": true,
			"password":     string(hashedPassword),
		}

		if err := db.Model(&existingUser).Updates(updates).Error; err != nil {
			fmt.Printf("Ошибка обновления пользователя: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("✓ Пользователь '%s' успешно обновлен!\n", login)
		fmt.Printf("  is_moderator: true\n")
		fmt.Printf("  Логин: %s\n", login)
		fmt.Printf("  Пароль: %s\n", password)
	} else if result.Error == gorm.ErrRecordNotFound {
		// Пользователь не существует - создаем нового
		fmt.Printf("Создаем нового модератора...\n")

		// Хешируем пароль
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			fmt.Printf("Ошибка хеширования пароля: %v\n", err)
			os.Exit(1)
		}

		// Создаем пользователя
		user := &ds.User{
			Login:       login,
			Password:    string(hashedPassword),
			IsModerator: true,
		}

		if err := db.Create(user).Error; err != nil {
			fmt.Printf("Ошибка создания пользователя: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("✓ Модератор успешно создан!\n")
		fmt.Printf("  Логин: %s\n", login)
		fmt.Printf("  Пароль: %s\n", password)
		fmt.Printf("  is_moderator: true\n")
	} else {
		fmt.Printf("Ошибка при проверке пользователя: %v\n", result.Error)
		os.Exit(1)
	}

	fmt.Println("\nТеперь вы можете войти в систему с этими учетными данными.")
}

package repository

import (
	"WEB/internal/app/ds"
	"WEB/internal/app/role"
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// GetCalculationsByUser возвращает заявки пользователя
func (r *Repository) GetCalculationsByUser(userUUID uuid.UUID) ([]ds.Calculation, error) {
	var user ds.User
	if err := r.db.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		return nil, err
	}

	var calculations []ds.Calculation
	err := r.db.
		Preload("Gases").
		Preload("Gases.Gas").
		Where("creator_id = ?", user.ID).
		Where("status <> ?", "deleted").
		Order("date_create DESC").
		Find(&calculations).Error

	if err != nil {
		return nil, err
	}

	return calculations, nil
}

// CreateCalculation создает новую заявку
func (r *Repository) CreateCalculation(calculation *ds.Calculation) error {
	return r.db.Create(calculation).Error
}

// GetUserCalculations возвращает заявки пользователя по UUID (без черновиков)
func (r *Repository) GetUserCalculations(userUUID string) ([]ds.Calculation, error) {
	var user ds.User
	if err := r.db.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		return nil, err
	}

	var calculations []ds.Calculation
	err := r.db.
		Preload("Gases").     // Загружаем связанные газы
		Preload("Gases.Gas"). // Загружаем данные самих газов
		Where("creator_id = ?", user.ID).
		Where("status <> ?", "draft"). // Исключаем черновики из списка "Мои заявки" (но включаем "deleted" и "formed")
		Order("date_create DESC").
		Find(&calculations).Error

	return calculations, err
}

// Register регистрирует нового пользователя
func (r *Repository) Register(user *ds.User) error {
	if user.UUID == uuid.Nil {
		user.UUID = uuid.New()
	}

	// Убраны проверки на уникальность логина и email - разрешена регистрация с любыми повторяющимися значениями
	return r.db.Create(user).Error
}

// GenerateHashString создает хеш пароля с использованием bcrypt
func (r *Repository) GenerateHashString(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// VerifyPassword проверяет соответствие пароля и хеша
func (r *Repository) VerifyPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// GetUserByLogin возвращает пользователя по логину
func (r *Repository) GetUserByLogin(login string) (*ds.User, error) {
	var user ds.User
	if err := r.db.Where("login = ?", login).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// AuthenticateUser аутентифицирует пользователя
func (r *Repository) AuthenticateUser(login, password string) (*ds.User, error) {
	user, err := r.GetUserByLogin(login)
	if err != nil {
		return nil, errors.New("invalid login or password")
	}

	// Проверяем пароль с использованием bcrypt
	err = r.VerifyPassword(user.Password, password)
	if err != nil {
		return nil, errors.New("invalid login or password")
	}

	return user, nil
}

// GetUserByUUID возвращает пользователя по UUID
func (r *Repository) GetUserByUUID(userUUID string) (*ds.User, error) {
	var user ds.User
	if err := r.db.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUserRole обновляет роль пользователя (только для администраторов)
func (r *Repository) UpdateUserRole(userUUID string, newRole role.Role) error {
	return r.db.Model(&ds.User{}).Where("uuid = ?", userUUID).Update("role", newRole).Error
}

// GetAllUsers возвращает всех пользователей (для администраторов)
func (r *Repository) GetAllUsers() ([]ds.User, error) {
	var users []ds.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// DeleteUser мягко удаляет пользователя
func (r *Repository) DeleteUser(userUUID string) error {
	return r.db.Where("uuid = ?", userUUID).Delete(&ds.User{}).Error
}

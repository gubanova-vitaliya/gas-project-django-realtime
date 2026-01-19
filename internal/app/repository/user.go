package repository

import (
	"WEB/internal/app/ds"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// GetCalculationsByUser возвращает заявки пользователя по ID
func (r *Repository) GetCalculationsByUser(userID uint) ([]ds.VesselPressure, error) {
	var calculations []ds.VesselPressure
	err := r.db.
		Preload("Gases").
		Preload("Gases.Gas").
		Where("creator_id = ?", userID).
		Where("status <> ?", "deleted").
		Order("date_create DESC").
		Find(&calculations).Error

	if err != nil {
		return nil, err
	}

	return calculations, nil
}

// CreateVesselPressure создает новую заявку
func (r *Repository) CreateVesselPressure(vesselPressure *ds.VesselPressure) error {
	return r.db.Create(vesselPressure).Error
}

// GetUserVesselPressures возвращает заявки пользователя по ID (без черновиков)
func (r *Repository) GetUserVesselPressures(userID uint) ([]ds.VesselPressure, error) {
	var vesselPressures []ds.VesselPressure
	err := r.db.
		Preload("Gases").     // Загружаем связанные газы
		Preload("Gases.Gas"). // Загружаем данные самих газов
		Where("creator_id = ?", userID).
		Where("status <> ?", "draft").   // Исключаем черновики из списка "Мои заявки"
		Where("status <> ?", "deleted"). // Исключаем удаленные заявки
		Order("date_create DESC").
		Find(&vesselPressures).Error

	return vesselPressures, err
}

// Register регистрирует нового пользователя
func (r *Repository) Register(user *ds.User) error {
	// IsModerator по умолчанию false
	user.IsModerator = false
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
	// Используем LOWER для регистронезависимого поиска
	if err := r.db.Where("LOWER(login) = LOWER(?)", login).First(&user).Error; err != nil {
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

// GetUserByID возвращает пользователя по ID
func (r *Repository) GetUserByID(userID uint) (*ds.User, error) {
	var user ds.User
	if err := r.db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUserModeratorStatus обновляет статус модератора пользователя
func (r *Repository) UpdateUserModeratorStatus(userID uint, isModerator bool) error {
	return r.db.Model(&ds.User{}).Where("id = ?", userID).Update("is_moderator", isModerator).Error
}

// GetAllUsers возвращает всех пользователей (для администраторов)
func (r *Repository) GetAllUsers() ([]ds.User, error) {
	var users []ds.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// DeleteUser удаляет пользователя
func (r *Repository) DeleteUser(userID uint) error {
	return r.db.Delete(&ds.User{}, userID).Error
}

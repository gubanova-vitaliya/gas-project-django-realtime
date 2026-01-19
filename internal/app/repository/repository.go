package repository

import (
	"WEB/internal/app/ds"
	"errors"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
	// MinIO
	minioEndpoint string
	minioUseSSL   bool
	minioBucket   string
	minioBaseURL  string
	minioAccess   string
	minioSecret   string
}

func New(dsn string) (*Repository, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Настройки MinIO из ENV с дефолтами под docker-compose
	// ВАЖНО: MinIO API работает на порту 9000, консоль на 9001
	endpoint := getenvDefault("MINIO_ENDPOINT", "localhost:19000")
	access := getenvDefault("MINIO_ACCESS_KEY", "minio")
	secret := getenvDefault("MINIO_SECRET_KEY", "minio124")
	bucket := getenvDefault("MINIO_BUCKET", "gases")
	baseURL := getenvDefault("MINIO_PUBLIC_BASEURL", "http://localhost:19000")
	useSSL := getenvDefault("MINIO_USE_SSL", "false") == "true"

	return &Repository{
		db:            db,
		minioEndpoint: endpoint,
		minioUseSSL:   useSSL,
		minioBucket:   bucket,
		minioBaseURL:  baseURL,
		minioAccess:   access,
		minioSecret:   secret,
	}, nil
}

// Expose DB when needed (read-only)
func (r *Repository) DB() *gorm.DB { return r.db }

// GetMinIOBaseURL возвращает базовый URL MinIO
func (r *Repository) GetMinIOBaseURL() string {
	return r.minioBaseURL
}

// GetMinIOBucket возвращает имя bucket MinIO
func (r *Repository) GetMinIOBucket() string {
	return r.minioBucket
}

// GetMinIOEndpoint возвращает endpoint MinIO
func (r *Repository) GetMinIOEndpoint() string {
	return r.minioEndpoint
}

// GetMinIOAccessKey возвращает access key MinIO
func (r *Repository) GetMinIOAccessKey() string {
	return r.minioAccess
}

// GetMinIOSecretKey возвращает secret key MinIO
func (r *Repository) GetMinIOSecretKey() string {
	return r.minioSecret
}

// GetMinIOUseSSL возвращает флаг использования SSL
func (r *Repository) GetMinIOUseSSL() bool {
	return r.minioUseSSL
}

// ---------- Users domain (старая реализация) ----------

var currentUserID uint = 1 // имитация сессии

func (r *Repository) UserRegister(login, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u := ds.User{Login: login, Password: string(hash)}
	return r.db.Create(&u).Error
}

func (r *Repository) UserLogin(login, password string) error {
	var u ds.User
	if err := r.db.Where("login = ?", login).First(&u).Error; err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return errors.New("invalid credentials")
	}
	currentUserID = u.ID
	return nil
}

func (r *Repository) UserLogout() { currentUserID = 0 }

func (r *Repository) UserMe() (*ds.User, error) {
	if currentUserID == 0 {
		return nil, errors.New("not authenticated")
	}
	var u ds.User
	if err := r.db.First(&u, currentUserID).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) UserUpdateMe(login *string) error {
	if currentUserID == 0 {
		return errors.New("not authenticated")
	}
	updates := map[string]interface{}{}
	if login != nil {
		updates["login"] = *login
	}
	if len(updates) == 0 {
		return nil
	}
	return r.db.Model(&ds.User{}).Where("id = ?", currentUserID).Updates(updates).Error
}

// helpers
func getenvDefault(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

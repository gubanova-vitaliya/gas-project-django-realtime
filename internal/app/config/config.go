package config

import (
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

type RedisConfig struct {
	Host        string
	Password    string
	Port        int
	User        string
	DialTimeout time.Duration
	ReadTimeout time.Duration
}

type JWTConfig struct {
	Secret        string
	ExpiresIn     time.Duration
	SigningMethod jwt.SigningMethod
}

type Config struct {
	ServiceHost string
	ServicePort int
	Redis       RedisConfig
	JWT         JWTConfig
}

func NewConfig() (*Config, error) {
	_ = godotenv.Load()

	viper.SetConfigName("config")
	viper.SetConfigType("toml")
	viper.AddConfigPath("config")
	viper.AddConfigPath(".")

	// Устанавливаем значения по умолчанию
	viper.SetDefault("ServiceHost", "localhost")
	viper.SetDefault("ServicePort", 8080)
	viper.SetDefault("jwt_secret", "test-secret")
	viper.SetDefault("jwt_expire", "24h")
	viper.SetDefault("jwt_algorithm", "HS256")
	viper.SetDefault("redis_host", "localhost")
	viper.SetDefault("redis_port", 6379)
	viper.SetDefault("redis_password", "")
	viper.SetDefault("redis_user", "")
	viper.SetDefault("redis_dial_timeout", "10s")
	viper.SetDefault("redis_read_timeout", "10s")

	err := viper.ReadInConfig()
	if err != nil {
		log.Warnf("Config file not found, using defaults: %v", err)
	}

	cfg := &Config{}

	// Читаем базовые настройки
	cfg.ServiceHost = viper.GetString("ServiceHost")
	cfg.ServicePort = viper.GetInt("ServicePort")

	// Настраиваем JWT
	jwtExpire, err := time.ParseDuration(viper.GetString("jwt_expire"))
	if err != nil {
		jwtExpire = 24 * time.Hour
	}

	cfg.JWT = JWTConfig{
		Secret:        viper.GetString("jwt_secret"),
		ExpiresIn:     jwtExpire,
		SigningMethod: getSigningMethod(viper.GetString("jwt_algorithm")),
	}

	// Настраиваем Redis
	redisDialTimeout, err := time.ParseDuration(viper.GetString("redis_dial_timeout"))
	if err != nil {
		redisDialTimeout = 10 * time.Second
	}

	redisReadTimeout, err := time.ParseDuration(viper.GetString("redis_read_timeout"))
	if err != nil {
		redisReadTimeout = 10 * time.Second
	}

	cfg.Redis = RedisConfig{
		Host:        viper.GetString("redis_host"),
		Password:    viper.GetString("redis_password"),
		Port:        viper.GetInt("redis_port"),
		User:        viper.GetString("redis_user"),
		DialTimeout: redisDialTimeout,
		ReadTimeout: redisReadTimeout,
	}

	log.Info("Configuration loaded successfully")
	return cfg, nil
}

func getSigningMethod(algorithm string) jwt.SigningMethod {
	switch algorithm {
	case "HS256":
		return jwt.SigningMethodHS256
	case "HS384":
		return jwt.SigningMethodHS384
	case "HS512":
		return jwt.SigningMethodHS512
	default:
		return jwt.SigningMethodHS256
	}
}

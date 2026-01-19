package handler

import (
	"context"
	"io"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/sirupsen/logrus"
)

// ProxyMinIOImage проксирует запросы к изображениям из MinIO
// GET /api/minio/*path
func (h *Handler) ProxyMinIOImage(ctx *gin.Context) {
	path := ctx.Param("path")
	if path == "" {
		ctx.JSON(400, gin.H{"error": "path required"})
		return
	}

	// Убираем ведущий слэш из path если он есть
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}

	// Получаем настройки MinIO из repository
	bucket := h.Repository.GetMinIOBucket()
	endpoint := h.Repository.GetMinIOEndpoint()
	accessKey := h.Repository.GetMinIOAccessKey()
	secretKey := h.Repository.GetMinIOSecretKey()
	useSSL := h.Repository.GetMinIOUseSSL()

	// Извлекаем имя объекта из path
	// Path может быть в формате: "gases/filename.jpg" или просто "filename.jpg"
	var objectName string
	if strings.HasPrefix(path, bucket+"/") {
		// Path уже содержит bucket, убираем его
		objectName = strings.TrimPrefix(path, bucket+"/")
	} else if strings.Contains(path, "/") {
		// Path содержит bucket в другом формате, извлекаем только имя файла
		parts := strings.Split(path, "/")
		if len(parts) > 1 && parts[0] == bucket {
			objectName = strings.Join(parts[1:], "/")
		} else {
			objectName = strings.Join(parts[1:], "/")
		}
	} else {
		// Path - это просто имя файла
		objectName = path
	}

	logrus.Infof("ProxyMinIOImage: path=%s, bucket=%s, objectName=%s, endpoint=%s", path, bucket, objectName, endpoint)

	// Создаем MinIO клиент
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		logrus.Errorf("Failed to create MinIO client: %v", err)
		ctx.JSON(500, gin.H{"error": "failed to connect to MinIO"})
		return
	}

	// Получаем объект из MinIO
	ctxBg := context.Background()
	object, err := minioClient.GetObject(ctxBg, bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		logrus.Errorf("Failed to get object from MinIO: %v, bucket=%s, object=%s", err, bucket, objectName)
		ctx.JSON(404, gin.H{"error": "image not found"})
		return
	}
	defer object.Close()

	// Получаем информацию об объекте
	objInfo, err := object.Stat()
	if err != nil {
		logrus.Errorf("Failed to stat object: %v", err)
		ctx.JSON(404, gin.H{"error": "image not found"})
		return
	}

	// Определяем Content-Type
	contentType := objInfo.ContentType
	if contentType == "" {
		// Определяем Content-Type по расширению файла
		lowerName := strings.ToLower(objectName)
		if strings.HasSuffix(lowerName, ".jpg") || strings.HasSuffix(lowerName, ".jpeg") {
			contentType = "image/jpeg"
		} else if strings.HasSuffix(lowerName, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(lowerName, ".gif") {
			contentType = "image/gif"
		} else if strings.HasSuffix(lowerName, ".webp") {
			contentType = "image/webp"
		} else {
			contentType = "application/octet-stream"
		}
	}

	ctx.Header("Content-Type", contentType)
	ctx.Header("Content-Length", string(rune(objInfo.Size)))
	ctx.Header("Cache-Control", "public, max-age=3600") // Кэширование на 1 час

	// Копируем данные из MinIO в ответ
	_, err = io.Copy(ctx.Writer, object)
	if err != nil {
		logrus.Errorf("Failed to copy object data: %v", err)
		return
	}
}

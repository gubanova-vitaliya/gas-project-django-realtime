package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ProxyMinIOImage проксирует запросы к изображениям из MinIO
// GET /api/minio/*path
func (h *Handler) ProxyMinIOImage(ctx *gin.Context) {
	path := ctx.Param("path")
	if path == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "path required"})
		return
	}

	// Убираем ведущий слэш из path если он есть
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}

	// Формируем URL к MinIO
	minioURL := h.Repository.GetMinIOBaseURL() + "/" + path
	log.Printf("ProxyMinIOImage: path=%s, minioURL=%s", path, minioURL)

	// Делаем запрос к MinIO
	resp, err := http.Get(minioURL)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch image"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	// Копируем заголовки
	for key, values := range resp.Header {
		for _, value := range values {
			ctx.Header(key, value)
		}
	}

	// Копируем тело ответа
	ctx.DataFromReader(resp.StatusCode, resp.ContentLength, resp.Header.Get("Content-Type"), resp.Body, nil)
}

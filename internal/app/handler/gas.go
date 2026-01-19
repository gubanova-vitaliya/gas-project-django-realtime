package handler

import (
	"errors"
	"net/http"
	"strconv"

	"WEB/internal/app/ds"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func (h *Handler) GetAllGases(ctx *gin.Context) {
	var gas []ds.Gas
	var err error

	search := ctx.Query("search")
	if search == "" {
		gas, err = h.Repository.GetAllGases()
	} else {
		gas, err = h.Repository.SearchGasesByTitle(search)
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		logrus.Error(err)
		return
	}

	ctx.HTML(http.StatusOK, "index.html", gin.H{
		"gases":      gas,
		"cart_count": h.Repository.GetCartCount(),
		"search":     search,
		"message":    ctx.Query("message"),
	})
}

func (h *Handler) GetGasById(ctx *gin.Context) {
	strId := ctx.Param("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gas ID"})
		return
	}

	gas, err := h.Repository.GetGasByID(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.HTML(http.StatusOK, "gases.html", gin.H{
		"gas":        gas,
		"cart_count": h.Repository.GetCartCount(),
	})
}

// -------- REST API --------

type apiGasCreate struct {
	Title       string  `json:"title" binding:"required"`
	Formula     string  `json:"formula" binding:"required"`
	MolarMass   float64 `json:"molar_mass" binding:"required"`
	Description string  `json:"description"`
}

type apiGasUpdate struct {
	Title       *string  `json:"title"`
	Formula     *string  `json:"formula"`
	MolarMass   *float64 `json:"molar_mass"`
	Description *string  `json:"description"`
}

// ApiGetGases GET /api/gases?search=...&min_molar_mass=...&max_molar_mass=...
func (h *Handler) ApiGetGases(ctx *gin.Context) {
	search := ctx.Query("search")

	var minMolarMass *float64
	var maxMolarMass *float64

	if minStr := ctx.Query("min_molar_mass"); minStr != "" {
		if val, err := strconv.ParseFloat(minStr, 64); err == nil {
			minMolarMass = &val
		}
	}

	if maxStr := ctx.Query("max_molar_mass"); maxStr != "" {
		if val, err := strconv.ParseFloat(maxStr, 64); err == nil {
			maxMolarMass = &val
		}
	}

	gases, err := h.Repository.GasList(search, minMolarMass, maxMolarMass)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.JSON(http.StatusOK, gases)
}

// ApiGetGas GET /api/gases/:id
func (h *Handler) ApiGetGas(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	gas, err := h.Repository.GetGasByID(id)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.JSON(http.StatusOK, gas)
}

// ApiCreateGas POST /api/gases
func (h *Handler) ApiCreateGas(ctx *gin.Context) {
	var req apiGasCreate
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	gas := ds.Gas{
		Title:       req.Title,
		Formula:     req.Formula,
		MolarMass:   req.MolarMass,
		Description: req.Description,
	}
	if err := h.Repository.GasCreate(&gas); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.JSON(http.StatusCreated, gas)
}

// ApiUpdateGas PUT /api/gases/:id
func (h *Handler) ApiUpdateGas(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req apiGasUpdate
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Repository.GasUpdate(id, req.Title, req.Formula, req.MolarMass, req.Description); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	gas, _ := h.Repository.GetGasByID(id)
	ctx.JSON(http.StatusOK, gas)
}

// ApiDeleteGas DELETE /api/gases/:id
func (h *Handler) ApiDeleteGas(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.Repository.GasDelete(id); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiUploadGasImage POST /api/gases/:id/image
func (h *Handler) ApiUploadGasImage(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	file, err := ctx.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}
	url, err := h.Repository.GasUploadImage(ctx, id, file)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"image_url": url})
}

// ApiAddGasToDraft POST /api/gases/:id/add-to-draft
func (h *Handler) ApiAddGasToDraft(ctx *gin.Context) {
	logrus.Infof("ApiAddGasToDraft called with gas ID: %s", ctx.Param("id"))
	
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		logrus.Errorf("Invalid gas ID: %s, error: %v", ctx.Param("id"), err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	
	logrus.Infof("Parsed gas ID: %d", id)
	
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		logrus.Errorf("Failed to get creator ID from context: %v", err)
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}
	
	logrus.Infof("Got creator ID: %d", creatorID)
	
	// Проверяем, что creatorID валиден
	if creatorID == 0 {
		logrus.Errorf("Invalid creator ID: 0")
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("invalid user ID"))
		return
	}
	
	logrus.Infof("Adding gas %d to draft for user %d", id, creatorID)
	if err := h.Repository.AddGasToDraft(uint(id), creatorID); err != nil {
		logrus.Errorf("Error adding gas %d to draft for user %d: %v", id, creatorID, err)
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	
	logrus.Infof("Successfully added gas %d to draft for user %d", id, creatorID)
	
	// Возвращаем данные корзины после добавления газа
	draftID, count, err := h.Repository.GetDraftCartInfo(creatorID)
	if err != nil {
		logrus.Errorf("Error getting draft cart info for user %d: %v", creatorID, err)
		// Если не удалось получить данные корзины, все равно возвращаем успех
		ctx.JSON(http.StatusOK, gin.H{
			"draft_id": nil,
			"count":    0,
		})
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"draft_id": draftID,
		"count":    count,
	})
}

// ApiGetCart GET /api/cart
func (h *Handler) ApiGetCart(ctx *gin.Context) {
	logrus.Infof("ApiGetCart called")
	
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Если пользователь не авторизован, возвращаем пустую корзину
		logrus.Infof("User not authenticated, returning empty cart")
		ctx.JSON(http.StatusOK, gin.H{
			"draft_id": nil,
			"count":    0,
		})
		return
	}
	
	logrus.Infof("Getting cart for creatorID: %d", creatorID)
	id, count, err := h.Repository.GetDraftCartInfo(creatorID)
	if err != nil {
		logrus.Errorf("Error getting draft cart info for creatorID %d: %v", creatorID, err)
		// Вместо возврата ошибки, возвращаем пустую корзину
		// Это более безопасно для пользователя
		ctx.JSON(http.StatusOK, gin.H{
			"draft_id": nil,
			"count":    0,
		})
		return
	}
	
	logrus.Infof("Cart info: draft_id=%d, count=%d", id, count)
	ctx.JSON(http.StatusOK, gin.H{"draft_id": id, "count": count})
}

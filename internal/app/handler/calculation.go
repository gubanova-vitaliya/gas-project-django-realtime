package handler

import (
	"WEB/internal/app/ds"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// -------- Request/Response DTOs --------

// CreateVesselPressureRequest represents request for creating vessel pressure
// @Description Create vessel pressure request
type CreateVesselPressureRequest struct {
	Title string `json:"title" binding:"required" example:"My Vessel Pressure"`
	Text  string `json:"text" example:"Vessel pressure description"`
}

// VesselPressureResponse represents vessel pressure response for API
// @Description Vessel pressure response object
type VesselPressureResponse struct {
	ID                uint                `json:"id" example:"1"`
	Status            string              `json:"status" example:"draft"`
	Text              string              `json:"text" example:"Vessel pressure description"`
	DateCreate        time.Time           `json:"date_create"`
	CreatorID         uint                `json:"creator_id" example:"1"`
	VesselPressureNumber int                 `json:"vessel_pressure_number" example:"1"` // Номер заявки для пользователя (начинается с 1)
	CalculatedCount   int                 `json:"calculated_count" example:"2"`   // Количество газов с рассчитанным давлением
	Gases             []GasVesselPressureDTO `json:"gases,omitempty"`
}

// GasVesselPressureDTO represents gas vessel pressure for API without sql.Null types
type GasVesselPressureDTO struct {
	ID                 uint     `json:"id"`
	GasID              uint     `json:"gas_id"`
	Sound              bool     `json:"sound"`
	Quantity           int      `json:"quantity"`
	Position           int      `json:"position"`
	InitialPressure    *float64 `json:"initial_pressure"`
	InitialTemperature *float64 `json:"initial_temperature"`
	FinalTemperature   *float64 `json:"final_temperature"`
	Volume             *float64 `json:"volume"`
	GasAmount          *float64 `json:"gas_amount"`
	FinalPressure      *float64 `json:"final_pressure"`
	Gas                GasDTO   `json:"gas"`
}

// GasDTO represents gas for API
type GasDTO struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Formula     string  `json:"formula"`
	MolarMass   float64 `json:"molar_mass"`
	ImageURL    string  `json:"image_url"`
	Description string  `json:"description"`
}

// VesselPressureDetailDTO represents full vessel pressure with gases for API
type VesselPressureDetailDTO struct {
	ID                 uint                `json:"id"`
	Status             string              `json:"status"`
	Text               string              `json:"text"`
	DateCreate         time.Time           `json:"date_create"`
	DateForm           *time.Time          `json:"date_form"`
	DateComplete       *time.Time          `json:"date_complete"`
	CreatorID          uint                `json:"creator_id"`
	ModeratorID        *uint               `json:"moderator_id"`
	InitialPressure    *float64            `json:"initial_pressure"`
	InitialTemperature *float64            `json:"initial_temperature"`
	FinalTemperature   *float64            `json:"final_temperature"`
	Volume             *float64            `json:"volume"`
	GasAmount          *float64            `json:"gas_amount"`
	FinalPressure      *float64            `json:"final_pressure"`
	GasesCount         int                 `json:"gases_count"`
	Gases              []GasVesselPressureDTO `json:"gases"`
}

// -------- HTML Handlers --------

// AddGasToVesselPressure добавляет газ в давление сосуда - POST запрос №4
func (h *Handler) AddGasToVesselPressure(ctx *gin.Context) {
	gasIDStr := ctx.PostForm("gas_id")
	gasID, err := strconv.Atoi(gasIDStr)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем данные газа
	gas, err := h.Repository.GetGasByID(gasID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Получаем ID пользователя из JWT токена (опционально, так как это старый веб-интерфейс)
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Для старого веб-интерфейса используем фиксированный ID как fallback
		creatorID = h.Repository.FixedCreatorID()
	}

	// Добавляем газ в давление сосуда (в память)
	err = h.Repository.AddGasToVesselPressure(creatorID, gas)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Редирект обратно на страницу газов с сообщением об успехе
	ctx.Redirect(http.StatusFound, "/gas?message=added")
}

// GetJournal отображает журнал давления сосуда - GET запрос №3
func (h *Handler) GetJournal(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена (опционально, так как это старый веб-интерфейс)
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Для старого веб-интерфейса используем фиксированный ID как fallback
		creatorID = h.Repository.FixedCreatorID()
	}

	// Получаем черновик давления сосуда с газами
	vesselPressure, err := h.Repository.GetDraftVesselPressure(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.HTML(http.StatusOK, "journal.html", gin.H{
		"vessel_pressure": vesselPressure,
		"gases":       vesselPressure.Gases,
		"cart_count":  len(vesselPressure.Gases),
	})
}

// RemoveGasFromVesselPressure логически удаляет газ из давления сосуда - POST запрос №5
func (h *Handler) RemoveGasFromVesselPressure(ctx *gin.Context) {
	gasCalculationIDStr := ctx.Param("id")
	gasVesselPressureID, err := strconv.ParseUint(gasCalculationIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем ID пользователя из JWT токена (опционально, так как это старый веб-интерфейс)
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Для старого веб-интерфейса используем фиксированный ID как fallback
		creatorID = h.Repository.FixedCreatorID()
	}

	err = h.Repository.RemoveGasFromVesselPressure(creatorID, uint(gasVesselPressureID))
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Редирект обратно в журнал
	ctx.Redirect(http.StatusFound, "/journal")
}

// UpdateGasParams обновляет параметры одного поля БЕЗ пересчета давления
func (h *Handler) UpdateGasParams(ctx *gin.Context) {
	gasCalcIDStr := ctx.Param("id")
	gasCalcID, err := strconv.ParseUint(gasCalcIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем все параметры из формы
	params := map[string]interface{}{}

	if initialPressure := ctx.PostForm("initial_pressure"); initialPressure != "" {
		if val, err := strconv.ParseFloat(initialPressure, 64); err == nil {
			params["initial_pressure"] = val
		}
	}
	if initialTemp := ctx.PostForm("initial_temperature"); initialTemp != "" {
		if val, err := strconv.ParseFloat(initialTemp, 64); err == nil {
			params["initial_temperature"] = val
		}
	}
	if finalTemp := ctx.PostForm("final_temperature"); finalTemp != "" {
		if val, err := strconv.ParseFloat(finalTemp, 64); err == nil {
			params["final_temperature"] = val
		}
	}
	if volume := ctx.PostForm("volume"); volume != "" {
		if val, err := strconv.ParseFloat(volume, 64); err == nil {
			params["volume"] = val
		}
	}
	if gasAmount := ctx.PostForm("gas_amount"); gasAmount != "" {
		if val, err := strconv.ParseFloat(gasAmount, 64); err == nil {
			params["gas_amount"] = val
		}
	}

	// Сохраняем параметры БЕЗ расчета давления сосуда
	if len(params) > 0 {
		if err := h.Repository.UpdateGasVesselPressureParams(uint(gasCalcID), params); err != nil {
			h.errorHandler(ctx, http.StatusInternalServerError, err)
			return
		}
	}

	// Возвращаем успешный ответ для AJAX
	ctx.JSON(http.StatusOK, gin.H{"status": "saved"})
}

// SubmitVesselPressure отправляет давление сосуда на модерацию
func (h *Handler) SubmitVesselPressure(ctx *gin.Context) {
	calculationIDStr := ctx.Param("id")
	vesselPressureID, err := strconv.ParseUint(calculationIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем ID пользователя из JWT токена (опционально, так как это старый веб-интерфейс)
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Для старого веб-интерфейса используем фиксированный ID как fallback
		creatorID = h.Repository.FixedCreatorID()
	}

	if err := h.Repository.SubmitVesselPressure(uint(vesselPressureID), creatorID); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Редирект на страницу успеха или обратно в журнал
	ctx.Redirect(http.StatusFound, "/journal?message=submitted")
}

// CalculateGasPressure рассчитывает давление для одного газа
func (h *Handler) CalculateGasPressure(ctx *gin.Context) {
	gasCalcIDStr := ctx.Param("id")
	gasCalcID, err := strconv.ParseUint(gasCalcIDStr, 10, 32)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Парсим параметры из формы
	params := map[string]float64{}

	if gasAmount, err := strconv.ParseFloat(ctx.PostForm("gas_amount"), 64); err == nil && gasAmount > 0 {
		params["gas_amount"] = gasAmount
	}
	if finalTemp, err := strconv.ParseFloat(ctx.PostForm("final_temperature"), 64); err == nil && finalTemp > 0 {
		params["final_temperature"] = finalTemp
	}
	if volume, err := strconv.ParseFloat(ctx.PostForm("volume"), 64); err == nil && volume > 0 {
		params["volume"] = volume
	}
	if initialPressure, err := strconv.ParseFloat(ctx.PostForm("initial_pressure"), 64); err == nil {
		params["initial_pressure"] = initialPressure
	}
	if initialTemp, err := strconv.ParseFloat(ctx.PostForm("initial_temperature"), 64); err == nil {
		params["initial_temperature"] = initialTemp
	}

	// Выполняем расчет давления сосуда
	calculatedPressure, err := h.Repository.CalculateGasPressure(uint(gasCalcID), params)
	if err != nil {
		// Показываем ошибку пользователю
		// Получаем ID пользователя из JWT токена (опционально)
		creatorID, _ := h.getCreatorIDFromContext(ctx)
		if creatorID == 0 {
			creatorID = h.Repository.FixedCreatorID()
		}
		vesselPressure, _ := h.Repository.GetDraftVesselPressure(creatorID)

		ctx.HTML(http.StatusOK, "journal.html", gin.H{
			"vessel_pressure": vesselPressure,
			"gases":       vesselPressure.Gases,
			"cart_count":  len(vesselPressure.Gases),
			"error":       err.Error(),
		})
		return
	}

	// Редирект с сообщением о результате
	ctx.Redirect(http.StatusFound, fmt.Sprintf("/journal?message=calculated&pressure=%.4f", calculatedPressure))
}

// CalculateAllGases рассчитывает все газы в давлении сосуда
func (h *Handler) CalculateAllGases(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена (опционально, так как это старый веб-интерфейс)
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		// Для старого веб-интерфейса используем фиксированный ID как fallback
		creatorID = h.Repository.FixedCreatorID()
	}

	vesselPressure, err := h.Repository.GetDraftVesselPressure(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Игнорируем возвращаемое значение результатов
	_, err = h.Repository.CalculateAllGases(vesselPressure.ID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Redirect(http.StatusFound, "/journal")
}

// -------- Calculation REST --------

type apiCalcListFilter struct {
	Status   string `form:"status"`
	DateFrom string `form:"date_from"`
	DateTo   string `form:"date_to"`
}

type apiCalcUpdate struct {
	Text   *string `json:"text"`
	Status *string `json:"status"`
}

// ApiListVesselPressures godoc
// @Summary List all vessel pressures (Moderator only)
// @Description Get list of all vessel pressures - requires moderator role
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by status"
// @Param date_from query string false "Filter by date from"
// @Param date_to query string false "Filter by date to"
// @Success 200 {array} map[string]interface{}
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures [get]
func (h *Handler) ApiListVesselPressures(ctx *gin.Context) {
	logrus.Infof("ApiListVesselPressures called with query: %s", ctx.Request.URL.RawQuery)
	
	var f apiCalcListFilter
	if err := ctx.ShouldBindQuery(&f); err != nil {
		logrus.Errorf("Error binding query parameters: %v", err)
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	
	logrus.Infof("ApiListVesselPressures filters: status=%s, dateFrom=%s, dateTo=%s", f.Status, f.DateFrom, f.DateTo)
	
	list, err := h.Repository.ListCalculations(f.Status, f.DateFrom, f.DateTo)
	if err != nil {
		logrus.Errorf("Error in ListCalculations: %v", err)
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	
	logrus.Infof("ApiListVesselPressures returning %d items", len(list))
	ctx.JSON(http.StatusOK, list)
}

// ApiGetCalculation godoc
// @Summary Get calculation details
// @Description Get calculation details by ID
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Calculation ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures/{id} [get]
func (h *Handler) ApiGetCalculation(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Получаем ID текущего пользователя
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	item, gases, err := h.Repository.GetVesselPressureDetail(uint(id))
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Проверяем, является ли пользователь модератором
	isModeratorInterface, exists := ctx.Get("is_moderator")
	isModerator := false
	if exists {
		if moderatorStatus, ok := isModeratorInterface.(bool); ok {
			isModerator = moderatorStatus
		}
	}

	// Проверяем, что давление сосуда принадлежит текущему пользователю ИЛИ пользователь является модератором
	if item.CreatorID != creatorID && !isModerator {
		h.errorHandler(ctx, http.StatusForbidden, errors.New("access denied: this vessel pressure belongs to another user"))
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"vessel_pressure": item, "gases": gases})
}

// ApiUpdateVesselPressure godoc
// @Summary Update vessel pressure
// @Description Update vessel pressure fields
// @Tags VesselPressures
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Vessel Pressure ID"
// @Param request body apiCalcUpdate true "Update data"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures/{id} [put]
func (h *Handler) ApiUpdateVesselPressure(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Получаем ID текущего пользователя
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Проверяем, что давление сосуда принадлежит текущему пользователю
	item, _, err := h.Repository.GetVesselPressureDetail(uint(id))
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	if item.CreatorID != creatorID {
		h.errorHandler(ctx, http.StatusForbidden, errors.New("access denied: this calculation belongs to another user"))
		return
	}

	var req apiCalcUpdate
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	if err := h.Repository.UpdateVesselPressureFields(uint(id), req.Text, req.Status); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiSubmitCalculation godoc
// @Summary Submit calculation
// @Description Submit calculation for moderation
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Calculation ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures/{id}/submit [post]
func (h *Handler) ApiSubmitCalculation(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	if err := h.Repository.SubmitVesselPressure(uint(id), creatorID); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiCompleteVesselPressure godoc
// @Summary Complete vessel pressure (Moderator only)
// @Description Mark vessel pressure as completed
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Vessel Pressure ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/vessel-pressures/{id}/complete [put]
func (h *Handler) ApiCompleteVesselPressure(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	// Получаем ID модератора из JWT токена
	moderatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}
	if err := h.Repository.CompleteVesselPressure(uint(id), moderatorID); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiCalculateVesselPressure godoc
// @Summary Calculate all gases in vessel pressure using async service (Moderator only)
// @Description Send vessel pressure requests to async service for all gases in vessel pressure
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Vessel Pressure ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures/{id}/calculate [post]
func (h *Handler) ApiCalculateVesselPressure(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Отправляем запросы в асинхронный сервис
	sentCount, err := h.Repository.SendCalculationToAsyncService(uint(id))
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"vessel_pressure_id":  id,
		"sent_to_service": sentCount,
		"message":         "Давление сосуда отправлено в асинхронный сервис. Результаты будут доступны через несколько секунд.",
	})
}

// ApiRejectVesselPressure godoc
// @Summary Reject vessel pressure (Moderator only)
// @Description Reject vessel pressure
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Vessel Pressure ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/vessel-pressures/{id}/reject [put]
func (h *Handler) ApiRejectVesselPressure(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	moderatorID := uint(2)
	if err := h.Repository.RejectVesselPressure(uint(id), moderatorID); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiDeleteVesselPressure godoc
// @Summary Delete vessel pressure (logical)
// @Description Delete vessel pressure by ID
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "Vessel Pressure ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures/{id} [delete]
func (h *Handler) ApiDeleteVesselPressure(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Получаем ID текущего пользователя
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Проверяем, что давление сосуда принадлежит текущему пользователю
	item, _, err := h.Repository.GetVesselPressureDetail(uint(id))
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	if item.CreatorID != creatorID {
		h.errorHandler(ctx, http.StatusForbidden, errors.New("access denied: this calculation belongs to another user"))
		return
	}

	if err := h.Repository.DeleteVesselPressure(uint(id)); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}
	ctx.Status(http.StatusNoContent)
}

// ApiMMDelete godoc
// @Summary Remove gas from draft
// @Description Remove gas vessel pressure entry from draft (by GasVesselPressure ID, not Gas ID)
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Param id path int true "GasVesselPressure ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/mm/gas/{id} [delete]
func (h *Handler) ApiMMDelete(ctx *gin.Context) {
	gasCalculationIDU64, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем ID пользователя из JWT токена для проверки прав
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Проверяем, что GasVesselPressure принадлежит черновику текущего пользователя
	var gasCalc ds.GasVesselPressure
	if err := h.Repository.DB().First(&gasCalc, gasCalculationIDU64).Error; err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	// Проверяем, что давление сосуда принадлежит текущему пользователю
	var vesselPressure ds.VesselPressure
	if err := h.Repository.DB().First(&vesselPressure, gasCalc.VesselPressureID).Error; err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	if vesselPressure.CreatorID != creatorID {
		h.errorHandler(ctx, http.StatusForbidden, errors.New("access denied"))
		return
	}

	// Удаляем запись GasVesselPressure по ее ID
	if err := h.Repository.DB().Delete(&ds.GasVesselPressure{}, gasCalculationIDU64).Error; err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

type apiMMUpdateResultReq struct {
	FinalPressure float64 `json:"final_pressure" binding:"required"`
	AuthToken     string  `json:"auth_token" binding:"required"`
}

type apiMMUpdateReq struct {
	Sound              *bool    `json:"sound"`
	Quantity           *int     `json:"quantity"`
	Position           *int     `json:"position"`
	InitialPressure    *float64 `json:"initial_pressure"`
	InitialVolume      *float64 `json:"initial_volume"`
	InitialTemperature *float64 `json:"initial_temperature"`
	FinalTemperature   *float64 `json:"final_temperature"`
	Volume             *float64 `json:"volume"`
	GasAmount          *float64 `json:"gas_amount"`
	FinalPressure      *float64 `json:"final_pressure"`
}

// ApiMMUpdate godoc
// @Summary Update gas calculation fields
// @Description Update gas calculation parameters (sound, quantity, position, calculation params)
// @Tags VesselPressures
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "GasVesselPressure ID"
// @Param request body apiMMUpdateReq true "Update data"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/mm/gas/{id} [put]
func (h *Handler) ApiMMUpdate(ctx *gin.Context) {
	gasCalculationIDU64, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Получаем ID пользователя из JWT токена для проверки прав
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Проверяем, что GasVesselPressure принадлежит черновику текущего пользователя
	var gasCalc ds.GasVesselPressure
	if err := h.Repository.DB().First(&gasCalc, gasCalculationIDU64).Error; err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	var vesselPressure ds.VesselPressure
	if err := h.Repository.DB().First(&vesselPressure, gasCalc.VesselPressureID).Error; err != nil {
		h.errorHandler(ctx, http.StatusNotFound, err)
		return
	}

	if vesselPressure.CreatorID != creatorID {
		h.errorHandler(ctx, http.StatusForbidden, errors.New("access denied"))
		return
	}

	var req apiMMUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		fmt.Printf("Error binding JSON request: %v\n", err)
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Обновляем параметры давления сосуда
	params := map[string]interface{}{}
	if req.Sound != nil {
		params["sound"] = *req.Sound
	}
	if req.Quantity != nil {
		params["quantity"] = *req.Quantity
	}
	if req.Position != nil {
		params["position"] = *req.Position
	}
	if req.InitialPressure != nil {
		params["initial_pressure"] = *req.InitialPressure
	}
	if req.InitialVolume != nil {
		params["initial_volume"] = *req.InitialVolume
	}
	if req.InitialTemperature != nil {
		params["initial_temperature"] = *req.InitialTemperature
	}
	if req.FinalTemperature != nil {
		params["final_temperature"] = *req.FinalTemperature
	}
	if req.Volume != nil {
		params["volume"] = *req.Volume
	}
	if req.GasAmount != nil {
		params["gas_amount"] = *req.GasAmount
	}
	if req.FinalPressure != nil {
		params["final_pressure"] = *req.FinalPressure
	}

	if len(params) > 0 {
		fmt.Printf("Updating gas calculation ID %d with params: %+v\n", gasCalculationIDU64, params)
		if err := h.Repository.UpdateGasVesselPressureParams(uint(gasCalculationIDU64), params); err != nil {
			// Логируем ошибку для отладки
			fmt.Printf("Error updating gas calculation params (ID: %d): %v\n", gasCalculationIDU64, err)
			h.errorHandler(ctx, http.StatusInternalServerError, err)
			return
		}
	}

	ctx.Status(http.StatusNoContent)
}

// ApiMMUpdateResult godoc
// @Summary Update gas calculation result from async service
// @Description Update final_pressure from async calculation service (requires auth token)
// @Tags VesselPressures
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "GasVesselPressure ID"
// @Param request body apiMMUpdateResultReq true "Result data with auth token"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/mm/gas/{id}/result [put]
func (h *Handler) ApiMMUpdateResult(ctx *gin.Context) {
	gasCalculationIDU64, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	var req apiMMUpdateResultReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Проверка токена авторизации (8 байт = 16 символов hex)
	const AUTH_TOKEN = "a1b2c3d4e5f6g7h8"
	if req.AuthToken != AUTH_TOKEN {
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("invalid auth token"))
		return
	}

	// Обновляем только final_pressure
	params := map[string]interface{}{
		"final_pressure": req.FinalPressure,
	}

	if err := h.Repository.UpdateGasVesselPressureParams(uint(gasCalculationIDU64), params); err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// UpdateAllGasParams обновляет параметры всех газов разом
func (h *Handler) UpdateAllGasParams(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	vesselPressure, err := h.Repository.GetDraftVesselPressure(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Обновляем параметры для каждого газа
	for _, gasCalc := range vesselPressure.Gases {
		params := map[string]interface{}{}

		gasIDStr := strconv.FormatUint(uint64(gasCalc.ID), 10)

		if initialPressure := ctx.PostForm("initial_pressure_" + gasIDStr); initialPressure != "" {
			if val, err := strconv.ParseFloat(initialPressure, 64); err == nil {
				params["initial_pressure"] = val
			}
		}
		if initialTemp := ctx.PostForm("initial_temperature_" + gasIDStr); initialTemp != "" {
			if val, err := strconv.ParseFloat(initialTemp, 64); err == nil {
				params["initial_temperature"] = val
			}
		}
		if finalTemp := ctx.PostForm("final_temperature_" + gasIDStr); finalTemp != "" {
			if val, err := strconv.ParseFloat(finalTemp, 64); err == nil {
				params["final_temperature"] = val
			}
		}
		if volume := ctx.PostForm("volume_" + gasIDStr); volume != "" {
			if val, err := strconv.ParseFloat(volume, 64); err == nil {
				params["volume"] = val
			}
		}
		if gasAmount := ctx.PostForm("gas_amount_" + gasIDStr); gasAmount != "" {
			if val, err := strconv.ParseFloat(gasAmount, 64); err == nil {
				params["gas_amount"] = val
			}
		}

		// Обновляем параметры если есть изменения
		if len(params) > 0 {
			if err := h.Repository.UpdateGasVesselPressureParams(gasCalc.ID, params); err != nil {
				h.errorHandler(ctx, http.StatusInternalServerError, err)
				return
			}
		}
	}

	// Редирект обратно в журнал
	ctx.Redirect(http.StatusFound, "/journal?message=saved")
}

// SaveAllGasParams сохраняет все параметры без расчета
func (h *Handler) SaveAllGasParams(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	vesselPressure, err := h.Repository.GetDraftVesselPressure(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Сохраняем параметры для каждого газа
	for _, gasCalc := range vesselPressure.Gases {
		params := map[string]interface{}{}

		gasIDStr := strconv.FormatUint(uint64(gasCalc.ID), 10)

		if initialPressure := ctx.PostForm("initial_pressure_" + gasIDStr); initialPressure != "" {
			if val, err := strconv.ParseFloat(initialPressure, 64); err == nil {
				params["initial_pressure"] = val
			}
		}
		if initialTemp := ctx.PostForm("initial_temperature_" + gasIDStr); initialTemp != "" {
			if val, err := strconv.ParseFloat(initialTemp, 64); err == nil {
				params["initial_temperature"] = val
			}
		}
		if finalTemp := ctx.PostForm("final_temperature_" + gasIDStr); finalTemp != "" {
			if val, err := strconv.ParseFloat(finalTemp, 64); err == nil {
				params["final_temperature"] = val
			}
		}
		if volume := ctx.PostForm("volume_" + gasIDStr); volume != "" {
			if val, err := strconv.ParseFloat(volume, 64); err == nil {
				params["volume"] = val
			}
		}
		if gasAmount := ctx.PostForm("gas_amount_" + gasIDStr); gasAmount != "" {
			if val, err := strconv.ParseFloat(gasAmount, 64); err == nil {
				params["gas_amount"] = val
			}
		}

		// Сохраняем параметры если есть изменения
		if len(params) > 0 {
			if err := h.Repository.UpdateGasVesselPressureParams(gasCalc.ID, params); err != nil {
				h.errorHandler(ctx, http.StatusInternalServerError, err)
				return
			}
		}
	}

	// Редирект обратно в журнал
	ctx.Redirect(http.StatusFound, "/journal?message=saved")
}

// ApiGetMyVesselPressures godoc
// @Summary Get user's vessel pressures
// @Description Get list of vessel pressures for authenticated user
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Success 200 {array} VesselPressureResponse
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/my-vessel-pressures [get]
func (h *Handler) ApiGetMyVesselPressures(ctx *gin.Context) {
	userID, exists := ctx.Get("user_id")
	if !exists {
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("user not authenticated"))
		return
	}

	// Преобразуем userID в uint
	var userIDValue uint
	switch v := userID.(type) {
	case uint:
		userIDValue = v
	case int:
		userIDValue = uint(v)
	case int64:
		userIDValue = uint(v)
	case float64:
		userIDValue = uint(v)
	default:
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("invalid user ID type"))
		return
	}

	vesselPressures, err := h.Repository.GetUserVesselPressures(userIDValue)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	creatorID := userIDValue

	// Преобразуем в DTO с газами
	var response []VesselPressureResponse
	for _, calc := range vesselPressures {
		// Получаем номер заявки для пользователя
		calcNumber, err := h.Repository.GetCalculationNumber(creatorID, calc.ID)
		if err != nil {
			// Если не удалось получить номер, используем ID
			calcNumber = int(calc.ID)
		}

		// Подсчитываем количество газов с рассчитанным давлением
		calculatedCount := 0
		for _, gasCalc := range calc.Gases {
			if gasCalc.FinalPressure.Valid && gasCalc.FinalPressure.Float64 > 0 {
				calculatedCount++
			}
		}

		// Газы уже загружены через Preload в GetUserCalculations
		response = append(response, VesselPressureResponse{
			ID:                calc.ID,
			Status:            calc.Status,
			Text:              calc.Text.String,
			DateCreate:        calc.DateCreate,
			CreatorID:         calc.CreatorID,
			VesselPressureNumber: calcNumber,
			CalculatedCount:   calculatedCount,
			Gases:             convertGasVesselPressuresToDTO(calc.Gases),
		})
	}

	ctx.JSON(http.StatusOK, response)
}

// ApiGetMyDraft godoc
// @Summary Get user's draft calculation
// @Description Get current user's draft calculation with gases
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Success 200 {object} CalculationDetailDTO
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/my-draft [get]
func (h *Handler) ApiGetMyDraft(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Получаем черновик давления сосуда с газами
	vesselPressure, err := h.Repository.GetDraftVesselPressure(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Преобразуем в DTO без sql.Null типов
	response := VesselPressureDetailDTO{
		ID:                 vesselPressure.ID,
		Status:             vesselPressure.Status,
		Text:               vesselPressure.Text.String,
		DateCreate:         vesselPressure.DateCreate,
		DateForm:           nullTimeToPointer(vesselPressure.DateForm),
		DateComplete:       nullTimeToPointer(vesselPressure.DateComplete),
		CreatorID:          vesselPressure.CreatorID,
		ModeratorID:        vesselPressure.ModeratorID,
		InitialPressure:    nullFloat64ToFloat(vesselPressure.InitialPressure),
		InitialTemperature: nullFloat64ToFloat(vesselPressure.InitialTemperature),
		FinalTemperature:   nullFloat64ToFloat(vesselPressure.FinalTemperature),
		Volume:             nullFloat64ToFloat(vesselPressure.Volume),
		GasAmount:          nullFloat64ToFloat(vesselPressure.GasAmount),
		FinalPressure:      nullFloat64ToFloat(vesselPressure.FinalPressure),
		GasesCount:         len(vesselPressure.Gases),
		Gases:              convertGasVesselPressuresToDTO(vesselPressure.Gases),
	}

	ctx.JSON(http.StatusOK, response)
}

// ApiGetMyDrafts godoc
// @Summary Get all user's draft calculations
// @Description Get all current user's draft calculations with gases
// @Tags VesselPressures
// @Produce json
// @Security BearerAuth
// @Success 200 {array} CalculationDetailDTO
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/my-drafts [get]
func (h *Handler) ApiGetMyDrafts(ctx *gin.Context) {
	// Получаем ID пользователя из JWT токена
	creatorID, err := h.getCreatorIDFromContext(ctx)
	if err != nil {
		h.errorHandler(ctx, http.StatusUnauthorized, err)
		return
	}

	// Получаем ВСЕ черновики давления сосуда пользователя
	vesselPressures, err := h.Repository.GetAllDraftVesselPressures(creatorID)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Преобразуем в массив DTO
	var response []VesselPressureDetailDTO
	for _, vesselPressure := range vesselPressures {
		dto := VesselPressureDetailDTO{
			ID:                 vesselPressure.ID,
			Status:             vesselPressure.Status,
			Text:               vesselPressure.Text.String,
			DateCreate:         vesselPressure.DateCreate,
			DateForm:           nullTimeToPointer(vesselPressure.DateForm),
			DateComplete:       nullTimeToPointer(vesselPressure.DateComplete),
			CreatorID:          vesselPressure.CreatorID,
			ModeratorID:        vesselPressure.ModeratorID,
			InitialPressure:    nullFloat64ToFloat(vesselPressure.InitialPressure),
			InitialTemperature: nullFloat64ToFloat(vesselPressure.InitialTemperature),
			FinalTemperature:   nullFloat64ToFloat(vesselPressure.FinalTemperature),
			Volume:             nullFloat64ToFloat(vesselPressure.Volume),
			GasAmount:          nullFloat64ToFloat(vesselPressure.GasAmount),
			FinalPressure:      nullFloat64ToFloat(vesselPressure.FinalPressure),
			GasesCount:         len(vesselPressure.Gases),
			Gases:              convertGasVesselPressuresToDTO(vesselPressure.Gases),
		}
		response = append(response, dto)
	}

	ctx.JSON(http.StatusOK, response)
}

// Вспомогательные функции для конвертации sql.Null типов
func nullTimeToPointer(nt sql.NullTime) *time.Time {
	if nt.Valid {
		return &nt.Time
	}
	return nil
}

func nullFloat64ToFloat(nf sql.NullFloat64) *float64 {
	if nf.Valid {
		return &nf.Float64
	}
	return nil
}

func convertGasVesselPressuresToDTO(gasCalcs []ds.GasVesselPressure) []GasVesselPressureDTO {
	result := make([]GasVesselPressureDTO, len(gasCalcs))
		for i, gc := range gasCalcs {
		result[i] = GasVesselPressureDTO{
			ID:                 gc.ID,
			GasID:              gc.GasID,
			Sound:              gc.Sound,
			Quantity:           gc.Quantity,
			Position:           gc.Position,
			InitialPressure:    nullFloat64ToFloat(gc.InitialPressure),
			InitialTemperature: nullFloat64ToFloat(gc.InitialTemperature),
			FinalTemperature:   nullFloat64ToFloat(gc.FinalTemperature),
			Volume:             nullFloat64ToFloat(gc.Volume),
			GasAmount:          nullFloat64ToFloat(gc.GasAmount),
			FinalPressure:      nullFloat64ToFloat(gc.FinalPressure),
			Gas: GasDTO{
				ID:          gc.Gas.ID,
				Title:       gc.Gas.Title,
				Formula:     gc.Gas.Formula,
				MolarMass:   gc.Gas.MolarMass,
				ImageURL:    gc.Gas.ImageURL,
				Description: gc.Gas.Description,
			},
		}
	}
	return result
}

// ApiCreateCalculation godoc
// @Summary Create calculation
// @Description Create a new calculation
// @Tags VesselPressures
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateVesselPressureRequest true "Vessel pressure data"
// @Success 201 {object} VesselPressureResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/vessel-pressures [post]
func (h *Handler) ApiCreateVesselPressure(ctx *gin.Context) {
	userID, exists := ctx.Get("user_id")
	if !exists {
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("user not authenticated"))
		return
	}

	var req CreateVesselPressureRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		h.errorHandler(ctx, http.StatusBadRequest, err)
		return
	}

	// Преобразуем userID в uint
	var userIDValue uint
	switch v := userID.(type) {
	case uint:
		userIDValue = v
	case int:
		userIDValue = uint(v)
	case int64:
		userIDValue = uint(v)
	case float64:
		userIDValue = uint(v)
	default:
		h.errorHandler(ctx, http.StatusUnauthorized, errors.New("invalid user ID type"))
		return
	}

	vesselPressure := &ds.VesselPressure{
		Status:     "draft",
		Text:       sql.NullString{String: req.Text, Valid: req.Text != ""},
		DateCreate: time.Now(),
		CreatorID:  userIDValue,
	}

	err := h.Repository.CreateVesselPressure(vesselPressure)
	if err != nil {
		h.errorHandler(ctx, http.StatusInternalServerError, err)
		return
	}

	// Возвращаем DTO
	ctx.JSON(http.StatusCreated, VesselPressureResponse{
		ID:         vesselPressure.ID,
		Status:     vesselPressure.Status,
		Text:       vesselPressure.Text.String,
		DateCreate: vesselPressure.DateCreate,
		CreatorID:  vesselPressure.CreatorID,
	})
}

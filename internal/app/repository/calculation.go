package repository

import (
	"WEB/internal/app/ds"
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// CalculateGasPressure рассчитывает давление для конкретного газа в давлении сосуда
func (r *Repository) CalculateGasPressure(gasVesselPressureID uint, params map[string]float64) (float64, error) {
	var gasCalc ds.GasVesselPressure
	if err := r.db.Preload("Gas").First(&gasCalc, gasVesselPressureID).Error; err != nil {
		return 0, err
	}

	// Получаем значения из параметров или из сохраненных данных
	gasAmount := getParamValue(params, "gas_amount", gasCalc.GasAmount)
	finalTemp := getParamValue(params, "final_temperature", gasCalc.FinalTemperature)
	volume := getParamValue(params, "volume", gasCalc.Volume)

	// Проверяем, что все обязательные параметры есть
	if gasAmount == 0 || finalTemp == 0 || volume == 0 {
		return 0, errors.New("missing required parameters: gas_amount, final_temperature, volume")
	}

	// Универсальная газовая постоянная (Дж/(моль·К))
	const R = 8.314462618

	// Расчет давления по уравнению Менделеева-Клапейрона: P = nRT/V
	// P в Паскалях, n в молях, T в Кельвинах, V в м³
	pressure := (gasAmount * R * finalTemp) / volume

	// Конвертируем в атмосферы (1 атм = 101325 Па)
	pressureAtm := pressure / 101325.0

	// Подготавливаем обновления с правильным преобразованием в sql.NullFloat64
	updates := map[string]interface{}{
		"gas_amount":        sql.NullFloat64{Float64: gasAmount, Valid: true},
		"final_temperature": sql.NullFloat64{Float64: finalTemp, Valid: true},
		"volume":            sql.NullFloat64{Float64: volume, Valid: true},
		"final_pressure":    sql.NullFloat64{Float64: pressureAtm, Valid: true}, // Сохраняем в атмосферах
	}

	// Добавляем опциональные параметры
	if initialPressure, ok := params["initial_pressure"]; ok {
		updates["initial_pressure"] = sql.NullFloat64{Float64: initialPressure, Valid: true}
	}
	if initialTemp, ok := params["initial_temperature"]; ok {
		updates["initial_temperature"] = sql.NullFloat64{Float64: initialTemp, Valid: true}
	}

	// Сохраняем в базу
	if err := r.db.Model(&ds.GasVesselPressure{}).Where("id = ?", gasVesselPressureID).Updates(updates).Error; err != nil {
		return 0, err
	}

	return pressureAtm, nil
}

// Вспомогательная функция для получения значения параметра
func getParamValue(params map[string]float64, key string, dbValue sql.NullFloat64) float64 {
	if val, ok := params[key]; ok {
		return val
	}
	if dbValue.Valid {
		return dbValue.Float64
	}
	return 0
}

// UpdateGasVesselPressureParams обновляет параметры давления сосуда для газа
func (r *Repository) UpdateGasVesselPressureParams(gasVesselPressureID uint, params map[string]interface{}) error {
	// Сначала получаем текущую запись
	var gasCalc ds.GasVesselPressure
	if err := r.db.First(&gasCalc, gasVesselPressureID).Error; err != nil {
		logrus.Errorf("Gas vessel pressure not found: ID %d, error: %v", gasVesselPressureID, err)
		return err
	}

	// Обновляем поля напрямую в структуре
	hasUpdates := false

	// Вспомогательная функция для преобразования значения в sql.NullFloat64
	toNullFloat64 := func(value interface{}) (sql.NullFloat64, bool) {
		switch v := value.(type) {
		case float64:
			return sql.NullFloat64{Float64: v, Valid: true}, true
		case *float64:
			if v != nil {
				return sql.NullFloat64{Float64: *v, Valid: true}, true
			}
		case float32:
			return sql.NullFloat64{Float64: float64(v), Valid: true}, true
		case int:
			return sql.NullFloat64{Float64: float64(v), Valid: true}, true
		case int64:
			return sql.NullFloat64{Float64: float64(v), Valid: true}, true
		}
		return sql.NullFloat64{}, false
	}

	// Обновляем числовые поля
	if val, ok := params["initial_pressure"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.InitialPressure = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["initial_volume"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			// В структуре нет InitialVolume, используем Volume
			gasCalc.Volume = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["initial_temperature"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.InitialTemperature = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["final_temperature"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.FinalTemperature = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["volume"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.Volume = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["gas_amount"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.GasAmount = nullVal
			hasUpdates = true
		}
	}
	if val, ok := params["final_pressure"]; ok {
		if nullVal, ok2 := toNullFloat64(val); ok2 {
			gasCalc.FinalPressure = nullVal
			hasUpdates = true
		}
	}

	// Обновляем нечисловые поля
	if val, ok := params["sound"]; ok {
		if boolVal, ok2 := val.(bool); ok2 {
			gasCalc.Sound = boolVal
			hasUpdates = true
		}
	}
	if val, ok := params["quantity"]; ok {
		if intVal, ok2 := val.(int); ok2 {
			gasCalc.Quantity = intVal
			hasUpdates = true
		}
	}
	if val, ok := params["position"]; ok {
		if intVal, ok2 := val.(int); ok2 {
			gasCalc.Position = intVal
			hasUpdates = true
		}
	}

	if !hasUpdates {
		logrus.Warnf("No updates to apply for gas vessel pressure ID: %d", gasVesselPressureID)
		return nil
	}

	logrus.Infof("Updating gas vessel pressure ID %d", gasVesselPressureID)
	// Используем Updates с Select для обновления только измененных полей
	// Это более безопасно, чем Save(), который обновляет все поля
	updates := make(map[string]interface{})
	if params["initial_pressure"] != nil {
		updates["initial_pressure"] = gasCalc.InitialPressure
	}
	if params["initial_volume"] != nil || params["volume"] != nil {
		updates["volume"] = gasCalc.Volume
	}
	if params["initial_temperature"] != nil {
		updates["initial_temperature"] = gasCalc.InitialTemperature
	}
	if params["final_temperature"] != nil {
		updates["final_temperature"] = gasCalc.FinalTemperature
	}
	if params["gas_amount"] != nil {
		updates["gas_amount"] = gasCalc.GasAmount
	}
	if params["final_pressure"] != nil {
		updates["final_pressure"] = gasCalc.FinalPressure
	}
	if params["sound"] != nil {
		updates["sound"] = gasCalc.Sound
	}
	if params["quantity"] != nil {
		updates["quantity"] = gasCalc.Quantity
	}
	if params["position"] != nil {
		updates["position"] = gasCalc.Position
	}

	fields := make([]string, 0, len(updates))
	for key := range updates {
		fields = append(fields, key)
	}

	err := r.db.Model(&ds.GasVesselPressure{}).
		Select(fields).
		Where("id = ?", gasVesselPressureID).
		Updates(updates).Error
	if err != nil {
		logrus.Errorf("Error updating gas vessel pressure ID %d: %v", gasVesselPressureID, err)
	}
	return err
}

// GetVesselPressureWithGases возвращает давление сосуда с газами и их параметрами
func (r *Repository) GetVesselPressureWithGases(vesselPressureID uint) (*ds.VesselPressure, error) {
	var vesselPressure ds.VesselPressure
	err := r.db.
		Preload("Gases", func(db *gorm.DB) *gorm.DB {
			return db.Order("position DESC") // Сортируем газы в обратном порядке - последний добавленный первый
		}).
		Preload("Gases.Gas").
		Preload("Creator").
		First(&vesselPressure, vesselPressureID).Error
	if err != nil {
		return nil, err
	}
	return &vesselPressure, nil
}

// GetDraftVesselPressure возвращает последний (самый новый) черновик давления сосуда пользователя
func (r *Repository) GetDraftVesselPressure(creatorID uint) (*ds.VesselPressure, error) {
	var vesselPressure ds.VesselPressure
	err := r.db.
		Preload("Gases", func(db *gorm.DB) *gorm.DB {
			return db.Order("position DESC") // Сортируем газы в обратном порядке - последний добавленный первый
		}).
		Preload("Gases.Gas").
		Where("creator_id = ? AND status = ?", creatorID, "draft").
		Order("date_create DESC"). // Берем последний созданный черновик
		First(&vesselPressure).Error

	if err != nil {
		// Если черновиков нет, возвращаем ошибку (не создаем новый автоматически)
		return nil, err
	}

	return &vesselPressure, nil
}

// GetAllDraftVesselPressures возвращает ВСЕ черновики давления сосуда пользователя
func (r *Repository) GetAllDraftVesselPressures(creatorID uint) ([]ds.VesselPressure, error) {
	var vesselPressures []ds.VesselPressure
	err := r.db.
		Preload("Gases", func(db *gorm.DB) *gorm.DB {
			return db.Order("position DESC")
		}).
		Preload("Gases.Gas").
		Where("creator_id = ? AND status = ?", creatorID, "draft").
		Order("date_create DESC"). // Сортируем по дате создания (новые сначала)
		Find(&vesselPressures).Error

	if err != nil {
		return nil, err
	}

	return vesselPressures, nil
}

// GetCalculationNumber возвращает номер заявки для пользователя (начинается с 1)
// Подсчитывает все заявки пользователя (не черновики), отсортированные по дате создания и ID
func (r *Repository) GetCalculationNumber(creatorID uint, calculationID uint) (int, error) {
	// Получаем все заявки пользователя (не черновики), отсортированные по дате создания и ID
	var allVesselPressures []ds.VesselPressure
	err := r.db.Unscoped().
		Where("creator_id = ? AND status <> ?", creatorID, "draft").
		Order("date_create ASC, id ASC").
		Find(&allVesselPressures).Error

	if err != nil {
		return 0, err
	}

	// Находим позицию текущей заявки в отсортированном списке
	for i, calc := range allVesselPressures {
		if calc.ID == calculationID {
			// Возвращаем номер (начинается с 1)
			return i + 1, nil
		}
	}

	// Если давление сосуда не найдено, возвращаем 0
	return 0, errors.New("vessel pressure not found")
}

// CalculateAllGases рассчитывает все газы в давлении сосуда (синхронный метод для обратной совместимости)
func (r *Repository) CalculateAllGases(vesselPressureID uint) (map[uint]float64, error) {
	var gasVesselPressures []ds.GasVesselPressure
	// GORM автоматически использует правильное имя колонки из тега column:calculation_id
	if err := r.db.Where("calculation_id = ?", vesselPressureID).Find(&gasVesselPressures).Error; err != nil {
		return nil, err
	}

	results := make(map[uint]float64)
	const R = 8.314462618

	for _, gasCalc := range gasVesselPressures {
		// Проверяем, что все необходимые параметры заполнены
		if gasCalc.GasAmount.Valid && gasCalc.FinalTemperature.Valid && gasCalc.Volume.Valid &&
			gasCalc.GasAmount.Float64 > 0 && gasCalc.FinalTemperature.Float64 > 0 && gasCalc.Volume.Float64 > 0 {

			// Расчет давления в Паскалях
			pressurePa := (gasCalc.GasAmount.Float64 * R * gasCalc.FinalTemperature.Float64) / gasCalc.Volume.Float64

			// Конвертируем в атмосферы
			pressureAtm := pressurePa / 101325.0
			results[gasCalc.ID] = pressureAtm

			// Сохраняем результат с правильным преобразованием в sql.NullFloat64
			finalPressure := sql.NullFloat64{
				Float64: pressureAtm,
				Valid:   true,
			}
			if err := r.db.Model(&ds.GasVesselPressure{}).Where("id = ?", gasCalc.ID).Update("final_pressure", finalPressure).Error; err != nil {
				logrus.Errorf("Error updating final_pressure for gas_vessel_pressure_id %d: %v", gasCalc.ID, err)
				continue
			}
		}
	}

	return results, nil
}

// SendCalculationToAsyncService отправляет расчеты в асинхронный сервис
func (r *Repository) SendCalculationToAsyncService(calculationID uint) (int, error) {
	var c ds.VesselPressure
	if err := r.db.Preload("Gases").First(&c, calculationID).Error; err != nil {
		return 0, err
	}

	// Проверяем, что давление сосуда сформировано
	if c.Status != "formed" {
		return 0, errors.New("only formed vessel pressures can be calculated")
	}

	asyncServiceURL := "http://localhost:8001"
	sentCount := 0

	for _, gasVesselPressure := range c.Gases {
		// Проверяем, что все необходимые параметры заполнены
		if gasVesselPressure.GasAmount.Valid && gasVesselPressure.FinalTemperature.Valid && gasVesselPressure.Volume.Valid &&
			gasVesselPressure.GasAmount.Float64 > 0 && gasVesselPressure.FinalTemperature.Float64 > 0 && gasVesselPressure.Volume.Float64 > 0 {

			requestData := map[string]interface{}{
				"gas_vessel_pressure_id":         gasVesselPressure.ID,
				"initial_pressure":    nullFloat64ToFloat(gasVesselPressure.InitialPressure),
				"initial_temperature": nullFloat64ToFloat(gasVesselPressure.InitialTemperature),
				"final_temperature":   gasVesselPressure.FinalTemperature.Float64,
				"volume":              gasVesselPressure.Volume.Float64,
				"gas_amount":          gasVesselPressure.GasAmount.Float64,
			}

			jsonData, err := json.Marshal(requestData)
			if err != nil {
				logrus.Errorf("Error marshaling request data: %v", err)
				continue
			}

			resp, err := http.Post(
				fmt.Sprintf("%s/", asyncServiceURL),
				"application/json",
				bytes.NewBuffer(jsonData),
			)
			if err != nil {
				logrus.Errorf("Error sending request to async service: %v", err)
				continue
			}
			resp.Body.Close()

			if resp.StatusCode == http.StatusOK {
				sentCount++
				logrus.Infof("Successfully sent vessel pressure task for gas_vessel_pressure_id %d to async service", gasVesselPressure.ID)
			} else {
				logrus.Errorf("Async service returned status %d for gas_vessel_pressure_id %d", resp.StatusCode, gasVesselPressure.ID)
			}
		}
	}

	return sentCount, nil
}

// ListCalculations - обновляем для работы с вычисляемым полем
func (r *Repository) ListCalculations(status string, dateFrom string, dateTo string) ([]map[string]interface{}, error) {
	logrus.Infof("ListCalculations called with status=%s, dateFrom=%s, dateTo=%s", status, dateFrom, dateTo)
	
	// Создаем подзапрос для подсчета газов с рассчитанным давлением
	// В БД колонка называется calculation_id, а не vessel_pressure_id
	subQuery := r.db.Model(&ds.GasVesselPressure{}).
		Select("calculation_id, COUNT(*) as calculated_count").
		Where("final_pressure > 0").
		Group("calculation_id")

	// Используем явные JOIN для загрузки пользователей вместо Preload
	// Это более надежно при использовании Select с подзапросами
	// Используем старое имя таблицы "calculations" вместо "vessel_pressures"
	q := r.db.Table("calculations").
		Select(`
			calculations.id,
			calculations.status,
			calculations.text,
			calculations.date_create,
			calculations.date_form,
			calculations.date_complete,
			COALESCE(sq.calculated_count, 0) as calculated_count,
			creator.login as creator_login,
			moderator.login as moderator_login
		`).
		Joins("LEFT JOIN (?) AS sq ON calculations.id = sq.calculation_id", subQuery).
		Joins("LEFT JOIN users as creator ON calculations.creator_id = creator.id").
		Joins("LEFT JOIN users as moderator ON calculations.moderator_id = moderator.id").
		Where("calculations.status <> ?", "deleted").
		Where("calculations.status <> ?", "draft")

	if status != "" {
		q = q.Where("calculations.status = ?", status)
	}
	if dateFrom != "" {
		// Фильтрация по дате формирования (только дата, без времени)
		// Проверяем, что date_form не NULL перед применением DATE()
		q = q.Where("calculations.date_form IS NOT NULL AND DATE(calculations.date_form) >= ?", dateFrom)
	}
	if dateTo != "" {
		// Фильтрация по дате формирования (только дата, без времени)
		// Проверяем, что date_form не NULL перед применением DATE()
		q = q.Where("calculations.date_form IS NOT NULL AND DATE(calculations.date_form) <= ?", dateTo)
	}

	var results []struct {
		ID               uint       `gorm:"column:id"`
		Status           string     `gorm:"column:status"`
		Text             string     `gorm:"column:text"`
		DateCreate       time.Time  `gorm:"column:date_create"`
		DateForm         *time.Time `gorm:"column:date_form"`
		DateComplete     *time.Time `gorm:"column:date_complete"`
		CalculatedCount  int        `gorm:"column:calculated_count"`
		CreatorLogin     string     `gorm:"column:creator_login"`
		ModeratorLogin   *string    `gorm:"column:moderator_login"`
	}

	if err := q.Order("calculations.date_create desc").Scan(&results).Error; err != nil {
		logrus.Errorf("Error scanning results in ListCalculations: %v", err)
		return nil, fmt.Errorf("failed to query calculations: %w", err)
	}
	
	logrus.Infof("ListCalculations found %d results", len(results))

	out := make([]map[string]interface{}, 0, len(results))
	for i, result := range results {
		logrus.Infof("Processing result %d/%d: ID=%d, Status=%s", i+1, len(results), result.ID, result.Status)
		
		moderatorLogin := ""
		if result.ModeratorLogin != nil {
			moderatorLogin = *result.ModeratorLogin
		}
		
		// Загружаем газы для каждой заявки с их параметрами
		var gasVesselPressures []ds.GasVesselPressure
		// В БД колонка называется calculation_id
		err := r.db.Preload("Gas").Where("calculation_id = ?", result.ID).Order("position DESC").Find(&gasVesselPressures).Error
		if err != nil {
			logrus.Errorf("Error loading gases for calculation_id %d: %v", result.ID, err)
			// Если не удалось загрузить газы, все равно добавляем заявку с пустым списком газов
			out = append(out, map[string]interface{}{
				"id":               result.ID,
				"status":           result.Status,
				"text":             result.Text,
				"date_create":      result.DateCreate,
				"date_form":        result.DateForm,
				"date_complete":    result.DateComplete,
				"creator_login":    result.CreatorLogin,
				"moderator_login":  moderatorLogin,
				"calculated_count": result.CalculatedCount,
				"gases":            []map[string]interface{}{},
			})
			continue
		}
		
		// Если газы загружены успешно, преобразуем их в формат для API
		gasesData := make([]map[string]interface{}, 0, len(gasVesselPressures))
		for _, gc := range gasVesselPressures {
				gasData := map[string]interface{}{
					"id":       gc.ID,
					"gas_id":   gc.GasID,
					"position": gc.Position,
					"quantity": gc.Quantity,
					"sound":    gc.Sound,
				}
				
				// Добавляем данные газа
				// Проверяем, что Gas загружен (Gas.ID может быть 0, если Preload не сработал)
				if gc.Gas.ID > 0 {
					// Нормализуем URL изображения перед возвратом
					normalizedGas := gc.Gas
					r.normalizeGasImage(&normalizedGas)
					gasData["gas"] = map[string]interface{}{
						"id":          normalizedGas.ID,
						"title":       normalizedGas.Title,
						"formula":     normalizedGas.Formula,
						"molar_mass":  normalizedGas.MolarMass,
						"image_url":   normalizedGas.ImageURL,
						"description": normalizedGas.Description,
					}
				} else {
					// Если Gas не загружен, пытаемся загрузить его вручную
					logrus.Warnf("Gas not preloaded for gas_vessel_pressure_id %d, gas_id %d, loading manually", gc.ID, gc.GasID)
					var gas ds.Gas
					if err := r.db.First(&gas, int(gc.GasID)).Error; err == nil {
						r.normalizeGasImage(&gas)
						gasData["gas"] = map[string]interface{}{
							"id":          gas.ID,
							"title":       gas.Title,
							"formula":     gas.Formula,
							"molar_mass":  gas.MolarMass,
							"image_url":   gas.ImageURL,
							"description": gas.Description,
						}
					} else {
						logrus.Errorf("Failed to load gas with ID %d: %v", gc.GasID, err)
					}
				}
				
				// Добавляем параметры расчета, если они есть
				if gc.InitialPressure.Valid {
					gasData["initial_pressure"] = gc.InitialPressure.Float64
				}
				if gc.InitialTemperature.Valid {
					gasData["initial_temperature"] = gc.InitialTemperature.Float64
				}
				if gc.FinalTemperature.Valid {
					gasData["final_temperature"] = gc.FinalTemperature.Float64
				}
				if gc.Volume.Valid {
					gasData["volume"] = gc.Volume.Float64
				}
				if gc.GasAmount.Valid {
					gasData["gas_amount"] = gc.GasAmount.Float64
				}
				if gc.FinalPressure.Valid {
					gasData["final_pressure"] = gc.FinalPressure.Float64
				}
				
			gasesData = append(gasesData, gasData)
		}
		
		out = append(out, map[string]interface{}{
			"id":               result.ID,
			"status":           result.Status,
			"text":             result.Text,
			"date_create":      result.DateCreate,
			"date_form":        result.DateForm,
			"date_complete":    result.DateComplete,
			"creator_login":    result.CreatorLogin,
			"moderator_login":  moderatorLogin,
			"calculated_count": result.CalculatedCount,
			"gases":            gasesData,
		})
	}
	return out, nil
}

// GetVesselPressureDetail возвращает детали давления сосуда с газами
func (r *Repository) GetVesselPressureDetail(id uint) (*ds.VesselPressure, []map[string]interface{}, error) {
	var c ds.VesselPressure
	if err := r.db.Preload("Creator").Preload("Moderator").First(&c, id).Error; err != nil {
		return nil, nil, err
	}
	var mm []ds.GasVesselPressure
	// В БД колонка называется calculation_id
	if err := r.db.Preload("Gas").Where("calculation_id = ?", id).Order("position DESC").Find(&mm).Error; err != nil {
		return &c, nil, err
	}
	list := make([]map[string]interface{}, 0, len(mm))
	for _, m := range mm {
		// Нормализуем URL изображения перед возвратом
		normalizedGas := m.Gas
		r.normalizeGasImage(&normalizedGas)
		gasData := map[string]interface{}{
			"id":          m.ID,
			"gas_id":      m.GasID,
			"title":       normalizedGas.Title,
			"formula":     normalizedGas.Formula,
			"molar_mass":  normalizedGas.MolarMass,
			"image_url":   normalizedGas.ImageURL,
			"description": normalizedGas.Description,
			"sound":       m.Sound,
			"quantity":    m.Quantity,
			"position":    m.Position,
			"final_pressure": func() interface{} {
				if m.FinalPressure.Valid {
					return m.FinalPressure.Float64
				}
				return nil
			}(),
		}

		// Добавляем данные расчета, если они есть
		if m.InitialPressure.Valid {
			gasData["initial_pressure"] = m.InitialPressure.Float64
		}
		if m.InitialTemperature.Valid {
			gasData["initial_temperature"] = m.InitialTemperature.Float64
		}
		if m.FinalTemperature.Valid {
			gasData["final_temperature"] = m.FinalTemperature.Float64
		}
		if m.Volume.Valid {
			gasData["volume"] = m.Volume.Float64
		}
		if m.GasAmount.Valid {
			gasData["gas_amount"] = m.GasAmount.Float64
		}

		// Нормализуем URL изображения перед возвратом
		normalizedGasForCompat := m.Gas
		r.normalizeGasImage(&normalizedGasForCompat)
		// Добавляем объект gas для совместимости
		gasData["gas"] = map[string]interface{}{
			"id":          normalizedGasForCompat.ID,
			"title":       normalizedGasForCompat.Title,
			"formula":     normalizedGasForCompat.Formula,
			"molar_mass":  normalizedGasForCompat.MolarMass,
			"image_url":   normalizedGasForCompat.ImageURL,
			"description": normalizedGasForCompat.Description,
		}

		list = append(list, gasData)
	}
	return &c, list, nil
}

// UpdateVesselPressureFields обновляет поля давления сосуда
func (r *Repository) UpdateVesselPressureFields(id uint, text *string, status *string) error {
	updates := map[string]interface{}{}
	if text != nil {
		updates["text"] = *text
	}
	if status != nil {
		// Валидация статуса
		validStatuses := []string{"draft", "formed", "deleted", "submitted", "completed", "rejected"}
		isValid := false
		for _, validStatus := range validStatuses {
			if *status == validStatus {
				isValid = true
				break
			}
		}
		if !isValid {
			return errors.New("invalid status")
		}
		updates["status"] = *status
	}
	return r.db.Model(&ds.VesselPressure{}).Where("id = ?", id).Updates(updates).Error
}

// SubmitVesselPressure с валидацией обязательных полей
func (r *Repository) SubmitVesselPressure(id uint, creatorID uint) error {
	var c ds.VesselPressure
	if err := r.db.Preload("Gases").First(&c, id).Error; err != nil {
		return err
	}
	if c.CreatorID != creatorID {
		return errors.New("only creator can submit")
	}
	if c.Status != "draft" {
		return errors.New("only draft can be submitted")
	}

	// Проверка обязательных полей
	if len(c.Gases) == 0 {
		return errors.New("vessel pressure must contain at least one gas")
	}

	// Проверка что у всех газов заполнены обязательные параметры
	for _, gas := range c.Gases {
		if !(gas.GasAmount.Valid && gas.FinalTemperature.Valid && gas.Volume.Valid &&
			gas.GasAmount.Float64 > 0 && gas.FinalTemperature.Float64 > 0 && gas.Volume.Float64 > 0) {
			return errors.New("all gases must have gas_amount, final_temperature and volume filled")
		}
	}

	now := time.Now()
	return r.db.Model(&ds.VesselPressure{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":    "formed",
		"date_form": now, // Устанавливаем дату формирования
	}).Error
}

// CompleteVesselPressure завершает давление сосуда, отправляя задачи в асинхронный сервис
func (r *Repository) CompleteVesselPressure(id uint, moderatorID uint) error {
	var c ds.VesselPressure
	if err := r.db.Preload("Gases").First(&c, id).Error; err != nil {
		return err
	}
	if c.Status != "formed" {
		return errors.New("only formed can be completed")
	}

	// Отправляем задачи на расчет давления для каждого газа в асинхронный сервис
	asyncServiceURL := "http://localhost:8001" // URL асинхронного сервиса

	for _, gasVesselPressure := range c.Gases {
		// Проверяем, что все необходимые параметры заполнены
		if gasVesselPressure.GasAmount.Valid && gasVesselPressure.FinalTemperature.Valid && gasVesselPressure.Volume.Valid &&
			gasVesselPressure.GasAmount.Float64 > 0 && gasVesselPressure.FinalTemperature.Float64 > 0 && gasVesselPressure.Volume.Float64 > 0 {

			// Формируем запрос к асинхронному сервису
			requestData := map[string]interface{}{
				"gas_vessel_pressure_id":         gasVesselPressure.ID,
				"initial_pressure":    nullFloat64ToFloat(gasVesselPressure.InitialPressure),
				"initial_temperature": nullFloat64ToFloat(gasVesselPressure.InitialTemperature),
				"final_temperature":   gasVesselPressure.FinalTemperature.Float64,
				"volume":              gasVesselPressure.Volume.Float64,
				"gas_amount":          gasVesselPressure.GasAmount.Float64,
			}

			jsonData, err := json.Marshal(requestData)
			if err != nil {
				logrus.Errorf("Error marshaling request data: %v", err)
				continue
			}

			// Отправляем POST-запрос к асинхронному сервису
			resp, err := http.Post(
				fmt.Sprintf("%s/", asyncServiceURL),
				"application/json",
				bytes.NewBuffer(jsonData),
			)
			if err != nil {
				logrus.Errorf("Error sending request to async service: %v", err)
				continue
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				logrus.Errorf("Async service returned status %d for gas_vessel_pressure_id %d", resp.StatusCode, gasVesselPressure.ID)
			} else {
				logrus.Infof("Successfully sent vessel pressure task for gas_vessel_pressure_id %d to async service", gasVesselPressure.ID)
			}
		}
	}

	// Обновляем статус давления сосуда на "completed" сразу (расчеты будут выполнены асинхронно)
	now := time.Now()
	return r.db.Model(&ds.VesselPressure{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        "completed",
		"moderator_id":  moderatorID,
		"date_complete": now, // Устанавливаем дату завершения
	}).Error
}

// Helper function для преобразования sql.NullFloat64 в float64
func nullFloat64ToFloat(nf sql.NullFloat64) *float64 {
	if nf.Valid {
		return &nf.Float64
	}
	return nil
}

// RejectVesselPressure отклоняет давление сосуда
func (r *Repository) RejectVesselPressure(id uint, moderatorID uint) error {
	var c ds.VesselPressure
	if err := r.db.First(&c, id).Error; err != nil {
		return err
	}
	if c.Status != "formed" {
		return errors.New("only formed can be rejected")
	}

	now := time.Now()
	return r.db.Model(&ds.VesselPressure{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        "rejected",
		"moderator_id":  moderatorID,
		"date_complete": now,
	}).Error
}

// DeleteVesselPressure логически удаляет давление сосуда
func (r *Repository) DeleteVesselPressure(id uint) error {
	return r.db.Model(&ds.VesselPressure{}).Where("id = ?", id).Update("status", "deleted").Error
}

// AddGasToVesselPressure добавляет газ в давление сосуда (черновик)
func (r *Repository) AddGasToVesselPressure(creatorID uint, gas *ds.Gas) error {
	return r.addGasToDraftDB(uint(gas.ID), creatorID)
}

// GetGasesInVesselPressure возвращает газы в давлении сосуда
func (r *Repository) GetGasesInVesselPressure(creatorID uint) ([]map[string]interface{}, error) {
	calc, err := r.ensureDraftVesselPressure(creatorID)
	if err != nil {
		return nil, err
	}

	var mm []ds.GasVesselPressure
	// В БД колонка называется calculation_id
	if err := r.db.Preload("Gas").Where("calculation_id = ?", calc.ID).Find(&mm).Error; err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, len(mm))
	for i, m := range mm {
		// Нормализуем URL изображения перед возвратом
		normalizedGas := m.Gas
		r.normalizeGasImage(&normalizedGas)
		results[i] = map[string]interface{}{
			"gas_vessel_pressure_id": m.ID,
			"gas_id":             m.GasID,
			"gas_title":          normalizedGas.Title,
			"gas_formula":        normalizedGas.Formula,
			"gas_molar_mass":     normalizedGas.MolarMass,
			"gas_image_url":      normalizedGas.ImageURL,
			"gas_description":    normalizedGas.Description,
		}
	}

	return results, nil
}

// RemoveGasFromVesselPressure удаляет газ из давления сосуда
func (r *Repository) RemoveGasFromVesselPressure(creatorID uint, gasVesselPressureID uint) error {
	return r.db.Where("id = ?", gasVesselPressureID).Delete(&ds.GasVesselPressure{}).Error
}

// GetCartCount возвращает количество газов в корзине
func (r *Repository) GetCartCount() int64 {
	creatorID := r.FixedCreatorID()
	_, count, err := r.draftCartInfo(creatorID)
	if err != nil {
		return 0
	}
	return count
}

// ---------- DB-backed draft and m-m operations ----------

// ensureDraftVesselPressure returns existing draft or creates a new one for creator
func (r *Repository) ensureDraftVesselPressure(creatorID uint) (*ds.VesselPressure, error) {
	var calc ds.VesselPressure
	err := r.db.Where("creator_id = ? AND status = ?", creatorID, "draft").First(&calc).Error
	if err == nil {
		logrus.Infof("Found existing draft for creator %d: ID=%d", creatorID, calc.ID)
		return &calc, nil
	}
	
	// Если ошибка не "record not found", это реальная ошибка БД
	if err != gorm.ErrRecordNotFound {
		logrus.Errorf("Error finding draft for creator %d: %v", creatorID, err)
		return nil, err
	}
	
	// Черновика нет, создаем новый
	logrus.Infof("No draft found for creator %d, creating new one", creatorID)
	now := time.Now()
	calc = ds.VesselPressure{
		Status:     "draft",
		DateCreate: now,
		CreatorID:  creatorID,
	}
	if err := r.db.Create(&calc).Error; err != nil {
		logrus.Errorf("Error creating draft for creator %d: %v", creatorID, err)
		return nil, err
	}
	logrus.Infof("Created new draft for creator %d: ID=%d", creatorID, calc.ID)
	return &calc, nil
}

// addGasToDraftDB добавляет газ в существующий черновик или создает новый черновик
func (r *Repository) addGasToDraftDB(gasID uint, creatorID uint) error {
	logrus.Infof("addGasToDraftDB: gasID=%d, creatorID=%d", gasID, creatorID)

	// Проверяем, что газ существует
	var gas ds.Gas
	// Преобразуем gasID из uint в int, так как Gas.ID имеет тип int
	gasIDInt := int(gasID)
	if err := r.db.First(&gas, gasIDInt).Error; err != nil {
		logrus.Errorf("Gas not found: gasID=%d (as int: %d), error: %v", gasID, gasIDInt, err)
		return fmt.Errorf("gas with ID %d not found: %w", gasID, err)
	}
	logrus.Infof("Gas found: ID=%d, Title=%s", gas.ID, gas.Title)
	
	// Проверяем, что ID газа совпадает
	if uint(gas.ID) != gasID {
		logrus.Errorf("Gas ID mismatch: expected %d, got %d", gasID, gas.ID)
		return fmt.Errorf("gas ID mismatch: expected %d, got %d", gasID, gas.ID)
	}

	// Получаем существующий черновик или создаем новый
	calc, err := r.ensureDraftVesselPressure(creatorID)
	if err != nil {
		logrus.Errorf("Error ensuring draft calculation for creator %d: %v", creatorID, err)
		return fmt.Errorf("failed to ensure draft vessel pressure: %w", err)
	}
	if calc == nil {
		logrus.Errorf("ensureDraftVesselPressure returned nil for creator %d", creatorID)
		return errors.New("failed to create or get draft vessel pressure")
	}
	logrus.Infof("Using draft calculation with ID: %d for creator %d", calc.ID, creatorID)

	// Проверяем, не добавлен ли уже этот газ в этот черновик
	// Используем gas.ID (int) для проверки, так как в БД gas_id имеет тип integer
	// В БД колонка называется calculation_id, а не vessel_pressure_id
	var existingGasVesselPressure ds.GasVesselPressure
	err = r.db.Where("calculation_id = ? AND gas_id = ?", calc.ID, int(gas.ID)).First(&existingGasVesselPressure).Error
	logrus.Infof("Checking existing gas: calculation_id=%d, gas_id=%d (as int: %d), error=%v", calc.ID, gasID, int(gas.ID), err)
	if err == nil {
		// Газ уже добавлен в черновик
		logrus.Infof("Gas %d already exists in draft %d", gasID, calc.ID)
		return nil
	}
	// Если ошибка не "record not found", это реальная ошибка
	if err != gorm.ErrRecordNotFound {
		logrus.Errorf("Error checking existing gas in draft: %v", err)
		return err
	}

	// Находим максимальный position в этом черновике
	var maxPosition int
	// Используем TableName() для получения правильного имени таблицы
	// В БД колонка называется calculation_id
	err = r.db.Table(ds.GasVesselPressure{}.TableName()).
		Where("calculation_id = ?", calc.ID).
		Select("COALESCE(MAX(position), 0)").
		Scan(&maxPosition).Error
	if err != nil {
		logrus.Errorf("Error getting max position for calculation_id %d: %v", calc.ID, err)
		// Если ошибка, просто используем 0
		maxPosition = 0
	}
	logrus.Infof("Max position for calculation_id %d: %d", calc.ID, maxPosition)

	// Создаем связь газ-черновик с правильным position
	// ВАЖНО: Gas.ID имеет тип int, а GasVesselPressure.GasID имеет тип uint
	// Но в базе данных gas_id имеет тип integer (соответствует int)
	// GORM должен автоматически преобразовать uint в int при сохранении
	mm := ds.GasVesselPressure{
		VesselPressureID: calc.ID,
		GasID:         uint(gas.ID), // Используем ID из найденного газа (преобразуем int в uint)
		Sound:         true,
		Quantity:      1,
		Position:      maxPosition + 1, // Следующий position после максимального
	}
	
	logrus.Infof("Prepared GasVesselPressure struct: VesselPressureID=%d (type: %T), GasID=%d (type: %T, from gas.ID=%d type: %T)", 
		mm.VesselPressureID, mm.VesselPressureID, mm.GasID, mm.GasID, gas.ID, gas.ID)

	logrus.Infof("Creating gas vessel pressure: VesselPressureID=%d, GasID=%d (from gas.ID=%d), Position=%d", 
		calc.ID, mm.GasID, gas.ID, maxPosition+1)
	
	// Проверяем, что calc.ID существует в базе
	var checkCalc ds.VesselPressure
	if err := r.db.First(&checkCalc, calc.ID).Error; err != nil {
		logrus.Errorf("VesselPressure with ID %d does not exist in database: %v", calc.ID, err)
		return fmt.Errorf("vessel pressure %d not found: %w", calc.ID, err)
	}
	logrus.Infof("Verified VesselPressure ID %d exists (status: %s, creator_id: %d)", 
		checkCalc.ID, checkCalc.Status, checkCalc.CreatorID)
	
	// Дополнительная проверка: убеждаемся, что gas существует
	var checkGas ds.Gas
	if err := r.db.First(&checkGas, gas.ID).Error; err != nil {
		logrus.Errorf("Gas with ID %d does not exist in database: %v", gas.ID, err)
		return fmt.Errorf("gas %d not found: %w", gas.ID, err)
	}
	logrus.Infof("Verified Gas ID %d exists (title: %s)", checkGas.ID, checkGas.Title)
	
	// Проверяем, что внешние ключи корректны
	if checkCalc.ID != calc.ID {
		logrus.Errorf("VesselPressure ID mismatch: expected %d, got %d", calc.ID, checkCalc.ID)
		return fmt.Errorf("vessel pressure ID mismatch")
	}
	if uint(checkGas.ID) != mm.GasID {
		logrus.Errorf("Gas ID mismatch: expected %d, got %d", mm.GasID, checkGas.ID)
		return fmt.Errorf("gas ID mismatch")
	}
	
	// Пробуем создать запись
	logrus.Infof("Attempting to create GasVesselPressure record in table '%s'", ds.GasVesselPressure{}.TableName())
	logrus.Infof("Record data: VesselPressureID=%d, GasID=%d, Position=%d, Sound=%v, Quantity=%d",
		mm.VesselPressureID, mm.GasID, mm.Position, mm.Sound, mm.Quantity)
	
	// Используем Model для явного указания таблицы
	err = r.db.Model(&ds.GasVesselPressure{}).Create(&mm).Error
	if err != nil {
		logrus.Errorf("Error creating gas vessel pressure with GORM: %v", err)
		logrus.Errorf("Error type: %T", err)
		logrus.Errorf("Details: VesselPressureID=%d, GasID=%d, calc.ID=%d, gas.ID=%d", 
			mm.VesselPressureID, mm.GasID, calc.ID, gas.ID)
		logrus.Errorf("Table name: %s", ds.GasVesselPressure{}.TableName())
		logrus.Errorf("Full error: %+v", err)
		
		// Попробуем альтернативный способ - прямой SQL запрос
		// В PostgreSQL используем $1, $2, ... вместо ?
		logrus.Warnf("Trying alternative method: direct SQL insert into %s", ds.GasVesselPressure{}.TableName())
		
		// Для PostgreSQL используем $1, $2, ... вместо ?
		// ВАЖНО: 
		// 1. В БД колонка называется calculation_id, а не vessel_pressure_id
		// 2. gas_id в БД имеет тип integer, поэтому преобразуем uint в int
		sqlQuery := fmt.Sprintf(
			"INSERT INTO %s (calculation_id, gas_id, sound, quantity, position) VALUES ($1, $2::integer, $3, $4, $5) RETURNING id",
			ds.GasVesselPressure{}.TableName(),
		)
		
		var newID uint
		if err2 := r.db.Raw(sqlQuery, mm.VesselPressureID, int(mm.GasID), mm.Sound, mm.Quantity, mm.Position).Scan(&newID).Error; err2 != nil {
			logrus.Errorf("Alternative SQL insert (with RETURNING) failed: %v", err2)
			// Попробуем без RETURNING (также с приведением типа для gas_id)
			sqlQuery2 := fmt.Sprintf(
				"INSERT INTO %s (calculation_id, gas_id, sound, quantity, position) VALUES ($1, $2::integer, $3, $4, $5)",
				ds.GasVesselPressure{}.TableName(),
			)
			if err3 := r.db.Exec(sqlQuery2, mm.VesselPressureID, int(mm.GasID), mm.Sound, mm.Quantity, mm.Position).Error; err3 != nil {
				logrus.Errorf("SQL insert without RETURNING also failed: %v", err3)
				// Попробуем с явным приведением типов для gas_id
				sqlQuery3 := fmt.Sprintf(
					"INSERT INTO %s (calculation_id, gas_id, sound, quantity, position) VALUES ($1, $2::integer, $3, $4, $5)",
					ds.GasVesselPressure{}.TableName(),
				)
				if err4 := r.db.Exec(sqlQuery3, mm.VesselPressureID, int(mm.GasID), mm.Sound, mm.Quantity, mm.Position).Error; err4 != nil {
					logrus.Errorf("SQL insert with type cast also failed: %v", err4)
					return fmt.Errorf("failed to create gas vessel pressure (all methods failed): gorm=%w, sql_returning=%v, sql=%v, sql_cast=%v", err, err2, err3, err4)
				}
				logrus.Infof("Alternative SQL insert (with type cast) succeeded")
			} else {
				logrus.Infof("Alternative SQL insert (without RETURNING) succeeded")
			}
		} else {
			logrus.Infof("Alternative SQL insert (with RETURNING) succeeded, new ID: %d", newID)
			mm.ID = newID
		}
	} else {
		logrus.Infof("GasVesselPressure created successfully with GORM, ID: %d", mm.ID)
	}

	logrus.Infof("Gas vessel pressure created successfully in draft with ID %d, position %d", calc.ID, mm.Position)
	return nil
}

// draftCartInfo returns last draft id and count of gases in that draft
func (r *Repository) draftCartInfo(creatorID uint) (uint, int64, error) {
	logrus.Infof("draftCartInfo called for creatorID: %d", creatorID)
	
	// Получаем последний черновик для draft_id
	var calc ds.VesselPressure
	err := r.db.Where("creator_id = ? AND status = ?", creatorID, "draft").
		Order("date_create DESC").
		First(&calc).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Если черновиков нет, возвращаем 0 - это нормальная ситуация
			logrus.Infof("No draft found for creatorID %d", creatorID)
			return 0, 0, nil
		}
		// Если это другая ошибка БД, логируем и возвращаем
		logrus.Errorf("Error finding draft for creatorID %d: %v", creatorID, err)
		return 0, 0, fmt.Errorf("failed to find draft: %w", err)
	}

	logrus.Infof("Found draft with ID %d for creatorID %d", calc.ID, creatorID)

	// Подсчитываем количество газов в этом черновике
	// В БД колонка называется calculation_id
	var count int64
	// Используем TableName() для получения правильного имени таблицы
	err = r.db.Table(ds.GasVesselPressure{}.TableName()).
		Where("calculation_id = ?", calc.ID).
		Count(&count).Error
	if err != nil {
		logrus.Errorf("Error counting gases in draft %d: %v", calc.ID, err)
		// Если не удалось подсчитать, возвращаем draft_id с count=0, а не ошибку
		// Это более безопасно - пользователь увидит черновик, но без газов
		return calc.ID, 0, nil
	}

	logrus.Infof("Draft %d has %d gases", calc.ID, count)
	return calc.ID, count, nil
}

// RemoveGasFromDraft removes by gas id (without PK of m-m)
func (r *Repository) RemoveGasFromDraft(creatorID uint, gasID uint) error {
	calc, err := r.ensureDraftVesselPressure(creatorID)
	if err != nil {
		return err
	}
	// В БД колонка называется calculation_id
	return r.db.Where("calculation_id = ? AND gas_id = ?", calc.ID, gasID).Delete(&ds.GasVesselPressure{}).Error
}

// UpdateMM updates fields in m-m
func (r *Repository) UpdateMM(creatorID uint, gasID uint, sound *bool, quantity *int, position *int) error {
	calc, err := r.ensureDraftVesselPressure(creatorID)
	if err != nil {
		return err
	}
	updates := map[string]interface{}{}
	if sound != nil {
		updates["sound"] = *sound
	}
	if quantity != nil {
		updates["quantity"] = *quantity
	}
	if position != nil {
		updates["position"] = *position
	}
	if len(updates) == 0 {
		return errors.New("no updatable fields")
	}
	// В БД колонка называется calculation_id
	return r.db.Model(&ds.GasVesselPressure{}).Where("calculation_id = ? AND gas_id = ?", calc.ID, gasID).Updates(updates).Error
}

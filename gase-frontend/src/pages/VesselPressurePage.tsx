import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { getDestApi } from "../../target_config";
import { AppDispatch, RootState } from "../store";
import {
  markVesselPressureAsFormed,
  markVesselPressureAsDeleted,
  deleteGasFromVesselPressure,
  updateVesselPressureText,
  getVesselPressure,
} from "../slices/vesselPressureSlice";
import { ROUTES } from "../Routes";
import "./VesselPressurePage.css";

const VesselPressurePage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Получаем данные из Redux
  const { error } = useSelector(
    (state: RootState) => state.vesselPressure
  );
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  // Локальное состояние для параметров каждого газа (ключ - "calcId_gasCalcId")
  const [gasParams, setGasParams] = useState<Record<string, {
    initial_pressure: number | null;
    initial_temperature: number | null;
    final_temperature: number | null;
    volume: number | null;
    gas_amount: number | null;
  }>>({});

  // Локальное состояние для названий заявок (ключ - calcId)
  const [draftTexts, setDraftTexts] = useState<Record<number, string>>({});

  // Состояние для одной заявки (когда id указан)
  const [singleCalculation, setSingleCalculation] = useState<any>(undefined);
  const [singleCalculationLoading, setSingleCalculationLoading] = useState(false);

  // Редирект если не авторизован
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  // Загружаем одну заявку по id
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const loadSingleCalculation = async () => {
      setSingleCalculationLoading(true);
      try {
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`${apiBase}/api/vessel-pressures/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSingleCalculation(response.data);
        // Также загружаем в Redux для совместимости
        await dispatch(getVesselPressure(id));
      } catch (err: any) {
        console.error('Ошибка при загрузке заявки:', err);
        if (err.response?.status === 404) {
          setSingleCalculation(null);
        }
      } finally {
        setSingleCalculationLoading(false);
      }
    };
    loadSingleCalculation();
  }, [id, dispatch, isAuthenticated]);

  // Инициализируем параметры из данных
  useEffect(() => {
    const params: Record<string, any> = {};
    const texts: Record<number, string> = {};

    if (singleCalculation) {
      const calc = singleCalculation;
      if (calc.text !== undefined && calc.text !== null) {
        texts[calc.id] = calc.text;
      } else {
        texts[calc.id] = '';
      }

      if (calc.gases) {
        calc.gases.forEach((gasCalc: any) => {
          const key = `${calc.id}_${gasCalc.id}`;
          params[key] = {
            initial_pressure: gasCalc.initial_pressure ?? null,
            initial_temperature: gasCalc.initial_temperature ?? null,
            final_temperature: gasCalc.final_temperature ?? null,
            volume: gasCalc.volume ?? null,
            gas_amount: gasCalc.gas_amount ?? null,
          };
        });
      }
    }

    setGasParams(params);
    setDraftTexts(texts);
  }, [singleCalculation]);

  // Обработчик изменения параметров
  const handleParamChange = (calcId: number, gasCalcId: number, paramName: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const key = `${calcId}_${gasCalcId}`;
    setGasParams((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [paramName]: numValue,
      },
    }));
  };

  // Обработчик сохранения всех параметров всех газов в черновике
  const handleSaveAllGasParams = async (calcId: number) => {
    const apiBase = getDestApi();
    const token = localStorage.getItem('auth_token');
    
    try {
      if (!singleCalculation || !singleCalculation.gases || singleCalculation.gases.length === 0) {
        return;
      }

      // Сохраняем параметры для каждого газа
      const savePromises = singleCalculation.gases.map((gasCalc: any) => {
        const key = `${calcId}_${gasCalc.id}`;
        const params = gasParams[key];
        if (!params) {
          return Promise.resolve();
        }

        return axios.put(
          `${apiBase}/api/mm/gas/${gasCalc.id}`,
          {
            initial_pressure: params.initial_pressure,
            initial_temperature: params.initial_temperature,
            final_temperature: params.final_temperature,
            volume: params.volume,
            gas_amount: params.gas_amount,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      });

      await Promise.all(savePromises);
      
      // Перезагружаем данные
      const response = await axios.get(`${apiBase}/api/vessel-pressures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSingleCalculation(response.data);
      await dispatch(getVesselPressure(id!));
    } catch (error: any) {
      console.error('Ошибка при сохранении параметров:', error);
    }
  };

  // Проверка возможности формирования заявки
  const canFormDraft = (calc: any) => {
    if (!calc.gases || calc.gases.length === 0) return false;
    
    return calc.gases.every((gas: any) => {
      const key = `${calc.id}_${gas.id}`;
      const params = gasParams[key];
      return (
        params &&
        params.gas_amount !== null &&
        params.final_temperature !== null &&
        params.volume !== null &&
        params.gas_amount > 0 &&
        params.final_temperature > 0 &&
        params.volume > 0
      );
    });
  };

  // Обработчик формирования заявки
  const handleFormCalculation = async (calcId: number) => {
    const result = await dispatch(markVesselPressureAsFormed(calcId.toString()));
    if (markVesselPressureAsFormed.fulfilled.match(result)) {
      // Перезагружаем заявку
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${apiBase}/api/vessel-pressures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSingleCalculation(response.data);
      await dispatch(getVesselPressure(id!));
    }
  };

  // Обработчик удаления заявки
  const handleDeleteCalculation = async (calcId: number) => {
    const result = await dispatch(markVesselPressureAsDeleted(calcId.toString()));
    if (markVesselPressureAsDeleted.fulfilled.match(result)) {
      // Переходим на страницу "Мои заявки"
      navigate(ROUTES.MY_CALCULATIONS);
    }
  };

  // Обработчик удаления газа из черновика
  const handleDeleteGas = async (gasCalcId: number) => {
    try {
      const result = await dispatch(deleteGasFromVesselPressure(gasCalcId));
      if (deleteGasFromVesselPressure.fulfilled.match(result)) {
        // Перезагружаем данные
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`${apiBase}/api/vessel-pressures/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSingleCalculation(response.data);
        await dispatch(getVesselPressure(id!));
      }
    } catch (error: any) {
      console.error('Ошибка при удалении газа:', error);
    }
  };

  // Обработчик сохранения названия заявки
  const handleSaveDraftText = async (calcId: number) => {
    const text = draftTexts[calcId] || '';
    const result = await dispatch(updateVesselPressureText({ appId: calcId.toString(), text }));
    if (updateVesselPressureText.fulfilled.match(result)) {
      // Перезагружаем данные
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${apiBase}/api/vessel-pressures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSingleCalculation(response.data);
      await dispatch(getVesselPressure(id!));
    }
  };

  if (!isAuthenticated || !id) {
    return null;
  }

  // Определяем список заявок для отображения (всегда одна заявка)
  const calculationsToShow = singleCalculation ? [singleCalculation] : [];
  const isLoading = singleCalculationLoading;

  return (
    <Container className="journal-container">
      <div className="journal-header">
        <h1>🧪 {singleCalculation?.status === 'draft' ? 'Журнал давления сосуда' : 'Заявка'}</h1>
        <p className="journal-subtitle">
          {singleCalculation?.status === 'draft' 
            ? 'Заполните параметры и нажмите кнопки для расчета давления сосуда' 
            : 'Просмотр заявки'}
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="error-alert">
          ❌ {error}
        </Alert>
      )}

      {isLoading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && calculationsToShow.length > 0 && (
        <div className="calculations-list">
          {calculationsToShow.map((calc: any) => {
            const isDraft = calc.status === 'draft';
            
            return (
              <Card key={calc.id} className="mb-4" style={{ border: '2px solid #FFA500' }}>
                <Card.Header style={{ backgroundColor: '#fff3e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong>{isDraft ? `Черновик #${calc.id}` : `Заявка #${calc.id}`}</strong>
                    </div>
                    {isDraft && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCalculation(calc.id)}
                          title="Удалить все давление сосуда"
                        >
                          Удалить
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Поле для ввода названия заявки (только для черновика) */}
                  {isDraft && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Название заявки"
                        value={draftTexts[calc.id] || ''}
                        onChange={(e) => setDraftTexts(prev => ({ ...prev, [calc.id]: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveDraftText(calc.id)}
                        title="Сохранить название заявки"
                      >
                        Сохранить название
                      </Button>
                    </div>
                  )}
                  {!isDraft && calc.text && (
                    <div style={{ marginTop: '12px' }}>
                      <strong>Название заявки:</strong> {calc.text}
                    </div>
                  )}
                </Card.Header>
                <Card.Body>
                  <div>
                    {calc.gases && calc.gases.map((gasCalc: any) => {
                      const key = `${calc.id}_${gasCalc.id}`;
                      const params = gasParams[key] || {};
                      return (
                        <div key={gasCalc.id} className="gas-calculation-card">
                          {/* Заголовок газа */}
                          <div className="gas-header">
                            <div>
                              <span className="gas-title">{gasCalc.gas?.title || 'Газ'}</span>
                              <span className="gas-formula"> ({gasCalc.gas?.formula || ''})</span>
                            </div>
                            <div className="gas-molar-mass">
                              {gasCalc.gas?.molar_mass?.toFixed(2) || '-'} г/моль
                            </div>
                          </div>

                          {/* Форма давления сосуда */}
                          <div className="parameters-grid">
                            <div className="param-group">
                              <label>Нач. давление (атм)</label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="1.0"
                                value={params.initial_pressure ?? ''}
                                className="param-input"
                                onChange={(e) => handleParamChange(calc.id, gasCalc.id, 'initial_pressure', e.target.value)}
                                disabled={!isDraft}
                              />
                            </div>

                            <div className="param-group">
                              <label>Нач. темп. (К)</label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="273.15"
                                value={params.initial_temperature ?? ''}
                                className="param-input"
                                onChange={(e) => handleParamChange(calc.id, gasCalc.id, 'initial_temperature', e.target.value)}
                                disabled={!isDraft}
                              />
                            </div>

                            <div className="param-group">
                              <label>Кон. темп. (К)</label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="373.15"
                                value={params.final_temperature ?? ''}
                                className="param-input"
                                onChange={(e) => handleParamChange(calc.id, gasCalc.id, 'final_temperature', e.target.value)}
                                disabled={!isDraft}
                              />
                            </div>

                            <div className="param-group">
                              <label>Объем (м³)</label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="0.001"
                                value={params.volume ?? ''}
                                className="param-input"
                                onChange={(e) => handleParamChange(calc.id, gasCalc.id, 'volume', e.target.value)}
                                disabled={!isDraft}
                              />
                            </div>

                            <div className="param-group">
                              <label>Кол-во в-ва (моль)</label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="0.1"
                                value={params.gas_amount ?? ''}
                                className="param-input"
                                onChange={(e) => handleParamChange(calc.id, gasCalc.id, 'gas_amount', e.target.value)}
                                disabled={!isDraft}
                              />
                            </div>
                          </div>

                          {/* Кнопки действий и результат */}
                          <div className="action-buttons">
                            {isDraft && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="me-2"
                                onClick={() => handleDeleteGas(gasCalc.id)}
                                title="Удалить газ из черновика"
                              >
                                Удалить газ
                              </Button>
                            )}
                            <div className="result-display">
                              {gasCalc.final_pressure !== null && gasCalc.final_pressure !== undefined ? (
                                <span className="final-pressure-value">
                                  {gasCalc.final_pressure.toFixed(4)} атм
                                </span>
                              ) : (
                                <span className="not-calculated">Не рассчитано</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Кнопки для всего черновика (только для черновика) */}
                  {isDraft && (
                    <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <Button
                        variant="success"
                        size="lg"
                        onClick={() => handleSaveAllGasParams(calc.id)}
                        title="Сохранить все параметры всех газов в черновике"
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => handleFormCalculation(calc.id)}
                        disabled={!canFormDraft(calc)}
                        title="Сформировать заявку (изменить статус на 'Сформирована')"
                      >
                        Сформировать заявку
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && calculationsToShow.length === 0 && (
        <div className="empty-journal">
          <div className="empty-icon">📝</div>
          <h3>Заявка не найдена</h3>
          <p>Проверьте правильность ID заявки</p>
        </div>
      )}
    </Container>
  );
};

export default VesselPressurePage;

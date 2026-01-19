import { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { getDestApi } from "../../target_config";
import { AppDispatch, RootState } from "../store";
import {
  markVesselPressureAsFormed,
  markVesselPressureAsDeleted,
  deleteGasFromVesselPressure,
  getAllDraftsAsync,
  updateVesselPressureText,
} from "../slices/vesselPressureSlice";
import { ROUTES } from "../Routes";
import "./JournalPage.css";

const JournalPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Получаем все черновики из Redux
  const { error, allDrafts, allDraftsLoading } = useSelector(
    (state: RootState) => state.vesselPressure
  );
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const isModerator = userProfile?.is_moderator === true;

  // Локальное состояние для параметров каждого газа (ключ - "draftId_gasCalcId")
  const [gasParams, setGasParams] = useState<Record<string, {
    initial_pressure: number | null;
    initial_temperature: number | null;
    final_temperature: number | null;
    volume: number | null;
    gas_amount: number | null;
  }>>({});

  // Локальное состояние для названий заявок (ключ - draftId)
  const [draftTexts, setDraftTexts] = useState<Record<number, string>>({});

  // Загружаем все черновики
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getAllDraftsAsync());
    }
  }, [dispatch, isAuthenticated]);

  // Инициализируем параметры из всех черновиков
  useEffect(() => {
    const params: Record<string, any> = {};
    const texts: Record<number, string> = {};
    
    if (allDrafts && allDrafts.length > 0) {
      allDrafts.forEach((draft: any) => {
        // Инициализируем text для черновика
        if (draft.text !== undefined && draft.text !== null) {
          texts[draft.id] = draft.text;
        } else {
          texts[draft.id] = '';
        }
        
        if (draft.gases) {
          draft.gases.forEach((gasCalc: any) => {
            const key = `${draft.id}_${gasCalc.id}`;
            params[key] = {
              initial_pressure: gasCalc.initial_pressure ?? null,
              initial_temperature: gasCalc.initial_temperature ?? null,
              final_temperature: gasCalc.final_temperature ?? null,
              volume: gasCalc.volume ?? gasCalc.initial_volume ?? null,
              gas_amount: gasCalc.gas_amount ?? null,
            };
          });
        }
      });
    }
    
    setGasParams(params);
    setDraftTexts(texts);
  }, [allDrafts]);

  // Редирект если не авторизован
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  // Обработчик изменения параметров
  const handleParamChange = (draftId: number, gasCalcId: number, paramName: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const key = `${draftId}_${gasCalcId}`;
    setGasParams((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [paramName]: numValue,
      },
    }));
  };

  // Обработчик сохранения всех параметров всех газов в черновике
  const handleSaveAllGasParams = async (draftId: number) => {
    const apiBase = getDestApi();
    const token = localStorage.getItem('auth_token');
    
    try {
      // Находим все газы в этом черновике
      const draft = allDrafts.find((d: any) => d.id === draftId);
      if (!draft || !draft.gases || draft.gases.length === 0) {
        return;
      }

      // Сохраняем параметры для каждого газа
      const savePromises = draft.gases.map((gasCalc: any) => {
        const key = `${draftId}_${gasCalc.id}`;
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

      // Ждем завершения всех сохранений
      await Promise.all(savePromises);
      
      // Перезагружаем черновики
      dispatch(getAllDraftsAsync());
    } catch (error: any) {
      console.error('Ошибка при сохранении параметров:', error);
    }
  };

  // Проверка возможности формирования заявки (черновика)
  const canFormDraft = (draft: any) => {
    if (!draft.gases || draft.gases.length === 0) return false;
    
    return draft.gases.every((gas: any) => {
      const key = `${draft.id}_${gas.id}`;
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

  // Обработчик формирования заявки (изменение статуса на "Сформирована")
  const handleFormCalculation = async (draftId: number) => {
    const result = await dispatch(markVesselPressureAsFormed(draftId.toString()));
    if (markVesselPressureAsFormed.fulfilled.match(result)) {
      // Обновляем все черновики (сформированный черновик исчезнет из списка)
      dispatch(getAllDraftsAsync());
    }
  };

  // Обработчик удаления заявки (изменение статуса на "Удалена")
  const handleDeleteCalculation = async (draftId: number) => {
    const result = await dispatch(markVesselPressureAsDeleted(draftId.toString()));
    if (markVesselPressureAsDeleted.fulfilled.match(result)) {
      // Обновляем все черновики (удаленный черновик исчезнет из списка)
      dispatch(getAllDraftsAsync());
    }
  };


  // Обработчик удаления газа из черновика (удаление в многие-ко-многим)
  const handleDeleteGas = async (gasCalcId: number) => {
    try {
      const result = await dispatch(deleteGasFromVesselPressure(gasCalcId));
      if (deleteGasFromVesselPressure.fulfilled.match(result)) {
        // Перезагружаем черновики
        dispatch(getAllDraftsAsync());
      } else if (deleteGasFromVesselPressure.rejected.match(result)) {
        console.error('Ошибка при удалении газа:', result.payload);
      }
    } catch (error: any) {
      console.error('Ошибка при удалении газа:', error);
    }
  };

  // Обработчик редактирования параметров газа (редактирование в многие-ко-многим)
  const handleEditGasParams = async (draftId: number, gasCalcId: number) => {
    const key = `${draftId}_${gasCalcId}`;
    const params = gasParams[key];
    if (!params) {
      return;
    }

    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.put(
        `${apiBase}/api/mm/gas/${gasCalcId}`,
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
      
      // Перезагружаем черновики
      dispatch(getAllDraftsAsync());
    } catch (error: any) {
      console.error('Ошибка при редактировании параметров газа:', error);
    }
  };

  // Обработчик сохранения названия заявки
  const handleSaveDraftText = async (draftId: number) => {
    const text = draftTexts[draftId] || '';
    const result = await dispatch(updateVesselPressureText({ appId: draftId.toString(), text }));
    if (updateVesselPressureText.fulfilled.match(result)) {
      // Перезагружаем черновики
      dispatch(getAllDraftsAsync());
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container className="journal-container">
      <div className="journal-header">
        <h1>🧪 Журнал давления сосуда</h1>
        <p className="journal-subtitle">Заполните параметры и нажмите кнопки для расчета давления сосуда</p>
      </div>

      {error && (
        <Alert variant="danger" className="error-alert">
          ❌ {error}
        </Alert>
      )}

      {allDraftsLoading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      )}

      <>
        {/* Отображение всех черновиков */}
        {!allDraftsLoading && allDrafts && allDrafts.length > 0 && (
          <div className="calculations-list">
            {allDrafts.map((draft: any) => (
              <Card key={draft.id} className="mb-4" style={{ border: '2px solid #FFA500' }}>
                <Card.Header style={{ backgroundColor: '#fff3e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong>Черновик #{draft.id}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSaveDraftText(draft.id)}
                        disabled={draft.status !== 'draft'}
                        title="Сохранить название заявки"
                      >
                        1) Сохранить
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleFormCalculation(draft.id)}
                        disabled={!canFormDraft(draft) || draft.status !== 'draft'}
                        title="Сформировать заявку (изменить статус на 'Сформирована')"
                      >
                        2) Сформировать
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteCalculation(draft.id)}
                        disabled={draft.status !== 'draft'}
                        title="Удалить все давление сосуда"
                      >
                        3) Удалить
                      </Button>
                    </div>
                  </div>
                  {/* Поле для ввода названия заявки */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Название заявки"
                      value={draftTexts[draft.id] || ''}
                      onChange={(e) => setDraftTexts(prev => ({ ...prev, [draft.id]: e.target.value }))}
                      disabled={draft.status !== 'draft'}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </Card.Header>
                <Card.Body>
                  <div>
                    {draft.gases && draft.gases.map((gasCalc: any, index: number) => {
                      const key = `${draft.id}_${gasCalc.id}`;
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
                                onChange={(e) => handleParamChange(draft.id, gasCalc.id, 'initial_pressure', e.target.value)}
                                disabled={draft.status !== 'draft'}
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
                                onChange={(e) => handleParamChange(draft.id, gasCalc.id, 'initial_temperature', e.target.value)}
                                disabled={draft.status !== 'draft'}
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
                                onChange={(e) => handleParamChange(draft.id, gasCalc.id, 'final_temperature', e.target.value)}
                                disabled={draft.status !== 'draft'}
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
                                onChange={(e) => handleParamChange(draft.id, gasCalc.id, 'volume', e.target.value)}
                                disabled={draft.status !== 'draft'}
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
                                onChange={(e) => handleParamChange(draft.id, gasCalc.id, 'gas_amount', e.target.value)}
                                disabled={draft.status !== 'draft'}
                              />
                            </div>
                          </div>

                          {/* Кнопки действий и результат */}
                          <div className="action-buttons">
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteGas(gasCalc.id)}
                              disabled={draft.status !== 'draft'}
                                title="Удалить газ из черновика (удаление в многие-ко-многим)"
                            >
                                4) Удалить в многие-ко-многим
                              </Button>
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleEditGasParams(draft.id, gasCalc.id)}
                                disabled={draft.status !== 'draft'}
                                title="Редактировать параметры газа (редактирование в многие-ко-многим)"
                              >
                                5) Редактировать в многие-ко-многим
                            </Button>
                            </div>
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
                </Card.Body>
              </Card>
            ))}
          </div>
        )}

        {!allDraftsLoading && (!allDrafts || allDrafts.length === 0) && (
          <div className="empty-journal">
            <div className="empty-icon">📝</div>
            <h3>Журнал давления сосуда пуст</h3>
            <p>Добавьте газы из каталога для начала расчета давления сосуда</p>
          </div>
        )}
      </>
    </Container>
  );
};

export default JournalPage;

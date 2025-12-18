import { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import { AppDispatch, RootState } from "../store";
import {
  calculateFinalPressure,
  markCalculationAsFormed,
  markCalculationAsDeleted,
  getMyCalculationsAsync,
  deleteGasFromCalculation,
} from "../slices/calculationSlice";
import { ROUTES } from "../Routes";
import "./JournalPage.css";

const JournalPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { myCalculations, myCalculationsLoading, error } = useSelector(
    (state: RootState) => state.calculation
  );
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  // Локальное состояние для параметров каждого газа (ключ - "calculationId_gasCalcId")
  const [gasParams, setGasParams] = useState<Record<string, {
    initial_pressure: number | null;
    initial_temperature: number | null;
    final_temperature: number | null;
    volume: number | null;
    gas_amount: number | null;
  }>>({});

  // Загружаем все заявки пользователя
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getMyCalculationsAsync());
    }
  }, [dispatch, isAuthenticated]);

  // Инициализируем параметры из загруженных данных заявок
  useEffect(() => {
    if (myCalculations && myCalculations.length > 0) {
      const params: Record<string, any> = {};
      myCalculations.forEach((calc) => {
        if (calc.gases && calc.gases.length > 0) {
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
      });
      setGasParams(params);
    }
  }, [myCalculations]);

  // Редирект если не авторизован
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  // Обработчик изменения параметров
  const handleParamChange = (calculationId: number, gasCalcId: number, paramName: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const key = `${calculationId}_${gasCalcId}`;
    setGasParams((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [paramName]: numValue,
      },
    }));
  };

  // Обработчик расчета для одного газа (редактирование связи многие-ко-многим)
  const handleCalculate = async (calculationId: number, gasCalcId: number) => {
    const key = `${calculationId}_${gasCalcId}`;
    const params = gasParams[key];
    if (params && params.initial_pressure !== null && params.initial_temperature !== null && 
        params.final_temperature !== null && params.volume !== null) {
      await dispatch(
        calculateFinalPressure({
          appId: calculationId,
          gasId: gasCalcId,
          initial_pressure: params.initial_pressure,
          initial_volume: params.volume,
          initial_temperature: params.initial_temperature,
          final_volume: params.volume,
          final_temperature: params.final_temperature,
        })
      );
      // Перезагружаем данные после расчета
      dispatch(getMyCalculationsAsync());
    }
  };

  // Обработчик сохранения заявки (сохранение результатов по всем газам в м-м)
  const handleSaveCalculation = async (calculationId: number, gases: any[]) => {
    if (!gases || gases.length === 0) return;

    for (const gas of gases) {
      const gasCalcId = gas.id;
      if (!gasCalcId) continue;
      const key = `${calculationId}_${gasCalcId}`;
      const params = gasParams[key];
      if (
        !params ||
        params.initial_pressure === null ||
        params.initial_temperature === null ||
        params.final_temperature === null ||
        params.volume === null
      ) {
        continue;
      }

      await dispatch(
        calculateFinalPressure({
          appId: calculationId,
          gasId: gasCalcId,
          initial_pressure: params.initial_pressure,
          initial_volume: params.volume,
          initial_temperature: params.initial_temperature,
          final_volume: params.volume,
          final_temperature: params.final_temperature,
        })
      );
    }

    // Обновляем список заявок
    dispatch(getMyCalculationsAsync());
  };

  // Обработчик удаления газа из связи многие-ко-многим
  const handleDeleteGas = async (gasCalcId: number) => {
    if (!gasCalcId) return;
    await dispatch(deleteGasFromCalculation(gasCalcId));
    // Перезагружаем данные после изменения
    dispatch(getMyCalculationsAsync());
  };

  // Обработчик формирования заявки (изменение статуса на "Сформирована")
  const handleFormCalculation = async (calculationId: number) => {
    const result = await dispatch(markCalculationAsFormed(calculationId.toString()));
    if (markCalculationAsFormed.fulfilled.match(result)) {
      // Обновляем список заявок
      dispatch(getMyCalculationsAsync());
    }
  };

  // Обработчик удаления заявки (изменение статуса на "Удалена")
  const handleDeleteCalculation = async (calculationId: number) => {
    const result = await dispatch(markCalculationAsDeleted(calculationId.toString()));
    if (markCalculationAsDeleted.fulfilled.match(result)) {
      // Обновляем список заявок
      dispatch(getMyCalculationsAsync());
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container className="journal-container">
      <div className="journal-header">
        <h1>🧪 Журнал расчетов</h1>
        <p className="journal-subtitle">Заполните параметры и нажмите кнопки для расчетов</p>
      </div>

      {error && (
        <Alert variant="danger" className="error-alert">
          ❌ {error}
        </Alert>
      )}

      {myCalculationsLoading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      )}

      {!myCalculationsLoading && myCalculations && myCalculations.length > 0 ? (
        <div className="calculations-list">
          {myCalculations.map((calc) => {
            const calcGases = calc.gases || [];
            return (
              <Card key={calc.id} className="mb-4" style={{ border: '2px solid #4680C2' }}>
                <Card.Header style={{ backgroundColor: '#e7f3ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Заявка #{calc.id}</strong>
                      {calc.title && <span className="ms-3">({calc.title})</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveCalculation(calc.id, calcGases)}
                        disabled={myCalculationsLoading || calcGases.length === 0}
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleFormCalculation(calc.id)}
                        disabled={myCalculationsLoading}
                      >
                        Сформировать
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteCalculation(calc.id)}
                        disabled={myCalculationsLoading}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body>
                  {calcGases.length === 0 ? (
                    <p>В заявке нет газов</p>
                  ) : (
                    calcGases.map((item: any, index: number) => {
                      const orderNumber = item.position || index + 1;
                      const gasCalcId = item.id || 0;
                      const key = `${calc.id}_${gasCalcId}`;
                      const params = gasParams[key] || {};
                      const canCalculate = params.initial_pressure !== null && 
                                          params.initial_temperature !== null && 
                                          params.final_temperature !== null && 
                                          params.volume !== null;

                      return (
                        <Card key={gasCalcId} className="gas-calculation-card mb-3">
                          <Card.Body>
                            {/* Заголовок газа */}
                            <div className="gas-header">
                              <div>
                                <span className="gas-number">#{orderNumber}</span>
                                <span className="gas-title">{item.gas?.title || 'Неизвестный газ'}</span>
                                <span className="gas-formula"> ({item.gas?.formula || '-'})</span>
                              </div>
                              <div className="gas-molar-mass">
                                {item.gas?.molar_mass?.toFixed(2) || '-'} г/моль
                              </div>
                            </div>

                            {/* Форма расчета */}
                            <div className="parameters-grid">
                              <div className="param-group">
                                <label>Нач. давление (атм)</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="1.0"
                                  value={params.initial_pressure ?? ''}
                                  className="param-input"
                                  onChange={(e) => handleParamChange(calc.id, gasCalcId, 'initial_pressure', e.target.value)}
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
                                  onChange={(e) => handleParamChange(calc.id, gasCalcId, 'initial_temperature', e.target.value)}
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
                                  onChange={(e) => handleParamChange(calc.id, gasCalcId, 'final_temperature', e.target.value)}
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
                                  onChange={(e) => handleParamChange(calc.id, gasCalcId, 'volume', e.target.value)}
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
                                  onChange={(e) => handleParamChange(calc.id, gasCalcId, 'gas_amount', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Кнопки действий и результат */}
                            <div className="action-buttons">
                              <Button
                                variant="success"
                                className="calculate-gas-btn"
                                onClick={() => handleCalculate(calc.id, gasCalcId)}
                                disabled={!canCalculate}
                              >
                                Редактировать в многие-ко-многим
                              </Button>

                              <Button
                                variant="danger"
                                className="delete-calculation-btn"
                                onClick={() => handleDeleteGas(gasCalcId)}
                              >
                                Удалить в многие-ко-многим
                              </Button>

                              <div className="result-display">
                                {item.final_pressure !== null &&
                                  item.final_pressure !== undefined &&
                                  !isNaN(Number(item.final_pressure)) ? (
                                    <span className="final-pressure-value">
                                      {Number(item.final_pressure).toFixed(4)} атм
                                    </span>
                                  ) : (
                                    <span className="not-calculated">Не рассчитано</span>
                                  )}
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      ) : !myCalculationsLoading ? (
        <div className="empty-journal">
          <div className="empty-icon">📝</div>
          <h3>Журнал расчетов пуст</h3>
          <p>Добавьте газы из каталога для начала расчетов</p>
        </div>
      ) : null}
    </Container>
  );
};

export default JournalPage;


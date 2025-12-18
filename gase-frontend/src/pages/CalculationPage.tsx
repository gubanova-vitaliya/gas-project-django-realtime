import { FC, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { AppDispatch, RootState } from '../store';
import {
  getCalculation,
  updateCalculation,
  deleteGasFromCalculation,
  updateGasInCalculationAsync,
  setCalculationData,
  clearCalculation,
  calculateFinalPressure,
  updateGasCalculationFields,
  markCalculationAsDeleted,
  markCalculationAsFormed,
  getMyCalculationsAsync,
} from '../slices/calculationSlice';
import { clearCart } from '../slices/cartSlice';
import { GasCard } from '../components/GasCard';
import { ROUTES } from '../Routes';
import { loadCartData } from '../hooks/useCartData';
import './CalculationPage.css';
import './JournalPage.css';

const CalculationPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const {
    app_id,
    gases,
    calculationData,
    error,
    isDraft,
    loading,
    count,
  } = useSelector((state: RootState) => state.calculation);

  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  // Редирект, если не авторизован
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.GASES);
    }
  }, [isAuthenticated, navigate]);

  // Загрузка данных заявки
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.GASES);
      return;
    }
    
    // Проверяем валидность ID
    if (!id || id === 'null' || id === 'undefined' || id === '0') {
      // ID отсутствует или невалидный
      navigate(ROUTES.MY_CALCULATIONS);
      return;
    }
    
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId <= 0 || numericId === 1) {
      // ID не является валидным числом или равен 1 (зарезервированное значение)
      navigate(ROUTES.MY_CALCULATIONS);
      return;
    }
    
    // Загружаем заявку только если ID валидный
    const loadData = async () => {
      await dispatch(getCalculation(id));
      loadCartData(dispatch);
    };
    loadData();
    
    return () => {
      // Не очищаем при размонтировании, чтобы сохранить состояние при навигации
    };
  }, [id, dispatch, isAuthenticated, navigate]);

  // Обработчик изменения полей
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    dispatch(
      setCalculationData({
        ...calculationData,
        [name]: value,
      })
    );
  };

  // Обработчик сохранения
  const handleSave = async () => {
    if (id) {
      await dispatch(updateCalculation({ appId: id, calculationData }));
    }
  };


  // Обработчик удаления газа из заявки
  const handleDeleteGas = async (gasCalculationId: number | undefined) => {
    if (gasCalculationId) {
      await dispatch(deleteGasFromCalculation(gasCalculationId));
      // Обновляем данные заявки после удаления
      if (id) {
        await dispatch(getCalculation(id));
      }
    }
  };

  // Обработчик изменения количества газа
  const handleQuantityChange = async (gasId: number | undefined, newQuantity: number) => {
    if (gasId && newQuantity > 0) {
      await dispatch(updateGasInCalculationAsync({ gasId, data: { quantity: newQuantity } }));
      // Обновляем данные заявки после изменения
      if (id) {
        await dispatch(getCalculation(id));
      }
    }
  };

  // Обработчик изменения полей расчета
  const handleCalculationFieldChange = (
    gasId: number,
    fieldName: 'initial_pressure' | 'initial_volume' | 'initial_temperature' | 'final_volume' | 'final_temperature',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);
    dispatch(
      updateGasCalculationFields({
        gasId,
        fields: { [fieldName]: numValue },
      })
    );
  };

  // Обработчик расчета финального давления
  const handleCalculate = async (item: any) => {
    if (
      !item.gas?.id ||
      !app_id ||
      !item.initial_pressure ||
      !item.initial_volume ||
      !item.initial_temperature ||
      !item.final_volume ||
      !item.final_temperature
    ) {
      // Поля не заполнены, расчет не выполняется
      return;
    }

    // Температуры должны быть в Кельвинах
    // Если пользователь вводит в Цельсиях, нужно преобразовать (но по умолчанию ожидаем Кельвины)
    const T1 = item.initial_temperature;
    const T2 = item.final_temperature;

    await dispatch(
      calculateFinalPressure({
        appId: app_id,
        gasId: item.gas.id,
        initial_pressure: item.initial_pressure,
        initial_volume: item.initial_volume,
        initial_temperature: T1,
        final_volume: item.final_volume,
        final_temperature: T2,
      })
    );
  };

  // Обработчик удаления заявки (статус "Удалена")
  const handleDelete = async () => {
    if (id) {
      const result = await dispatch(markCalculationAsDeleted(id));
      if (markCalculationAsDeleted.fulfilled.match(result)) {
        // Сбрасываем корзину и заявку
        dispatch(clearCart());
        dispatch(clearCalculation());
        // Обновляем список заявок и переходим на страницу "Мои заявки"
        await dispatch(getMyCalculationsAsync());
        navigate(ROUTES.MY_CALCULATIONS);
      }
    }
  };

  // Обработчик формирования заявки (статус "Сформирована")
  const handleForm = async () => {
    if (id) {
      const result = await dispatch(markCalculationAsFormed(id));
      if (markCalculationAsFormed.fulfilled.match(result)) {
        // Сбрасываем корзину и заявку
        dispatch(clearCart());
        dispatch(clearCalculation());
        // Обновляем список заявок и переходим на страницу "Мои заявки"
        await dispatch(getMyCalculationsAsync());
        navigate(ROUTES.MY_CALCULATIONS);
      }
    }
  };

  // Обработчик клика на карточку газа
  const handleCardClick = (gasId: number) => {
    navigate(`${ROUTES.GASES}/${gasId}`);
  };

  if (loading) {
    return (
      <Container className="calculation-page">
        <div className="loading-container">
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="calculation-page">
      <div className="calculation-header">
        <h1>{isDraft ? 'Корзина заявок (Журнал расчетов)' : 'Заявка'}</h1>
        {count > 0 && (
          <div className="calculation-count">
            Газов в заявке: <strong>{count}</strong>
          </div>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {error !== 'Заявка не найдена' && (
      <div className="calculation-content">
        {!isDraft ? (
          <div className="calculation-data-view">
            <h4>Название: {calculationData.title || 'Без названия'}</h4>
            <h4>Описание: {calculationData.text || 'Нет описания'}</h4>
          </div>
        ) : (
          <div className="calculation-data-edit">
            <Form.Group controlId="title" className="mb-3">
              <Form.Label>Название заявки</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={calculationData.title || ''}
                onChange={handleInputChange}
                placeholder="Введите название"
              />
            </Form.Group>

            <Form.Group controlId="text" className="mb-3">
              <Form.Label>Описание</Form.Label>
              <Form.Control
                as="textarea"
                name="text"
                value={calculationData.text || ''}
                onChange={handleInputChange}
                rows={4}
                placeholder="Введите описание"
              />
            </Form.Group>

            <div className="calculation-buttons">
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
              {isDraft && (
                <>
                  <Button variant="danger" onClick={handleDelete} disabled={loading}>
                    {loading ? 'Удаление...' : 'Удалить'}
                  </Button>
                  <Button variant="success" onClick={handleForm} disabled={loading}>
                    {loading ? 'Формирование...' : 'Сформировать'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <h2 className="mt-4">Выбранные газы</h2>
        {gases.length === 0 ? (
          <div className="no-gases">
            <p>В заявке пока нет газов</p>
          </div>
        ) : (
          <Row>
            {gases.map((item, index) => {
              const orderNumber = item.order_number || index + 1;
              return (
                <Col key={item.gas?.id || index} md={12} className="mb-4">
                  <div className="calculation-gas-card" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, marginRight: '15px' }}>
                        Газ #{orderNumber}
                      </h4>
                      {item.gas && (
                        <GasCard gas={item.gas} onCardClick={handleCardClick} />
                      )}
                    </div>
                    
                    {isDraft && (
                      <div className="gas-calculations-form" style={{ marginTop: '15px' }}>
                        <Row>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Начальное давление P1 (Па):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={item.initial_pressure ?? ''}
                                onChange={(e) =>
                                  handleCalculationFieldChange(
                                    item.gas!.id,
                                    'initial_pressure',
                                    e.target.value
                                  )
                                }
                                placeholder="Введите P1"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Начальный объем V1 (м³):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.001"
                                value={item.initial_volume ?? ''}
                                onChange={(e) =>
                                  handleCalculationFieldChange(
                                    item.gas!.id,
                                    'initial_volume',
                                    e.target.value
                                  )
                                }
                                placeholder="Введите V1"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Начальная температура T1 (К):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.1"
                                value={item.initial_temperature ?? ''}
                                onChange={(e) =>
                                  handleCalculationFieldChange(
                                    item.gas!.id,
                                    'initial_temperature',
                                    e.target.value
                                  )
                                }
                                placeholder="Введите T1"
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Конечный объем V2 (м³):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.001"
                                value={item.final_volume ?? ''}
                                onChange={(e) =>
                                  handleCalculationFieldChange(
                                    item.gas!.id,
                                    'final_volume',
                                    e.target.value
                                  )
                                }
                                placeholder="Введите V2"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Конечная температура T2 (К):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.1"
                                value={item.final_temperature ?? ''}
                                onChange={(e) =>
                                  handleCalculationFieldChange(
                                    item.gas!.id,
                                    'final_temperature',
                                    e.target.value
                                  )
                                }
                                placeholder="Введите T2"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Финальное давление P2 (Па):</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.01"
                                value={item.final_pressure ?? ''}
                                disabled
                                style={{ backgroundColor: '#f8f9fa' }}
                                placeholder="Результат расчета"
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={3}>
                            <Form.Group className="mb-2">
                              <Form.Label>Количество:</Form.Label>
                              <Form.Control
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  handleQuantityChange(item.gas?.id, newQuantity);
                                }}
                                style={{ width: '100px', display: 'inline-block', marginLeft: '10px' }}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        <div style={{ marginTop: '15px' }}>
                          <Button
                            variant="success"
                            onClick={() => handleCalculate(item)}
                            disabled={loading}
                            className="me-2"
                          >
                            Редактировать в многие-ко-многим
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteGas(item.id)}
                            disabled={loading}
                          >
                            Удалить в многие-ко-многим
                          </Button>
                        </div>
                      </div>
                    )}
                    {!isDraft && (
                      <div className="gas-calculations-view" style={{ marginTop: '15px' }}>
                        <div className="gas-calculation-card">
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

                          <div className="parameters-grid">
                            <div className="param-group">
                              <label>Нач. давление (атм)</label>
                              <div className="result-display">
                                <span className="final-pressure-value">
                                  {item.initial_pressure !== null && item.initial_pressure !== undefined 
                                    ? Number(item.initial_pressure).toFixed(4) 
                                    : 'Не указано'}
                                </span>
                              </div>
                            </div>

                            <div className="param-group">
                              <label>Нач. темп. (К)</label>
                              <div className="result-display">
                                <span className="final-pressure-value">
                                  {item.initial_temperature !== null && item.initial_temperature !== undefined 
                                    ? Number(item.initial_temperature).toFixed(2) 
                                    : 'Не указано'}
                                </span>
                              </div>
                            </div>

                            <div className="param-group">
                              <label>Кон. темп. (К)</label>
                              <div className="result-display">
                                <span className="final-pressure-value">
                                  {item.final_temperature !== null && item.final_temperature !== undefined 
                                    ? Number(item.final_temperature).toFixed(2) 
                                    : 'Не указано'}
                                </span>
                              </div>
                            </div>

                            <div className="param-group">
                              <label>Объем (м³)</label>
                              <div className="result-display">
                                <span className="final-pressure-value">
                                  {item.volume !== null && item.volume !== undefined 
                                    ? Number(item.volume).toFixed(4) 
                                    : (item.final_volume !== null && item.final_volume !== undefined 
                                        ? Number(item.final_volume).toFixed(4) 
                                        : 'Не указано')}
                                </span>
                              </div>
                            </div>

                            <div className="param-group">
                              <label>Кол-во в-ва (моль)</label>
                              <div className="result-display">
                                <span className="final-pressure-value">
                                  {item.gas_amount !== null && item.gas_amount !== undefined 
                                    ? Number(item.gas_amount).toFixed(4) 
                                    : 'Не указано'}
                                </span>
                              </div>
                            </div>

                            <div className="param-group">
                              <label>Финальное давление (атм)</label>
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
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
      )}
    </Container>
  );
};

export default CalculationPage;


import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Spinner, Alert, Badge, Card, Form, Row, Col, Button } from 'react-bootstrap';
import { AppDispatch, RootState } from '../store';
import { getMyCalculationsAsync, clearMyCalculations } from '../slices/calculationSlice';
import { ROUTES } from '../Routes';
import './MyCalculationsPage.css';

const MyCalculationsPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { myCalculations, myCalculationsLoading, error } = useSelector(
    (state: RootState) => state.calculation
  );
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, formed, deleted
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Очищаем список заявок перед загрузкой новых данных
    dispatch(clearMyCalculations());
    // Затем загружаем заявки текущего пользователя
    dispatch(getMyCalculationsAsync());
  }, [dispatch, navigate, isAuthenticated]);

  // По умолчанию устанавливаем фильтр "за сегодня"
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  }, []);

  // Применяем фильтры
  const filteredCalculations = (myCalculations || []).filter((calc) => {
    // Фильтр по статусу
    if (statusFilter !== 'all' && calc.status !== statusFilter) {
      return false;
    }

    // Фильтр по дате
    if (dateFrom || dateTo) {
      const calcDate = new Date(calc.date_create);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // Включаем весь день

      if (fromDate && calcDate < fromDate) {
        return false;
      }
      if (toDate && calcDate > toDate) {
        return false;
      }
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { variant: string; label: string } } = {
      draft: { variant: 'secondary', label: 'Черновик' },
      submitted: { variant: 'info', label: 'Отправлена' },
      completed: { variant: 'success', label: 'Завершена' },
      rejected: { variant: 'danger', label: 'Отклонена' },
      deleted: { variant: 'danger', label: 'Удалена' },
      formed: { variant: 'primary', label: 'Сформирована' },
    };

    const statusInfo = statusMap[status] || { variant: 'light', label: status };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateInput = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleCardClick = (id: number) => {
    navigate(`${ROUTES.CALCULATION}/${id}`);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  if (myCalculationsLoading) {
    return (
      <Container className="my-calculations-page">
        <div className="loading-container">
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-calculations-page">
      <h1 className="page-title">Мои заявки</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Фильтры */}
      <Card className="mb-4">
        <Card.Header>
          <strong>Фильтры</strong>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Статус заявки</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="formed">Сформирована</option>
                  <option value="deleted">Удалена</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Дата от</Form.Label>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Дата до</Form.Label>
                <Form.Control
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-3">
            <Col>
              <Button variant="secondary" onClick={handleResetFilters}>
                Сбросить фильтры
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!myCalculations || myCalculations.length === 0 ? (
        <div className="no-calculations">
          <p>У вас пока нет заявок</p>
        </div>
      ) : filteredCalculations.length === 0 ? (
        <div className="no-calculations">
          <p>Нет заявок, соответствующих выбранным фильтрам</p>
        </div>
      ) : (
        <div className="calculations-list">
          {filteredCalculations.map((calc) => {
            return (
              <Card
                key={calc.id}
                className="calculation-card mb-3"
                onClick={() => handleCardClick(calc.id)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Заявка #{calc.id}</strong>
                    {calc.title && <span className="ms-3">({calc.title})</span>}
                  </div>
                  {getStatusBadge(calc.status)}
                </Card.Header>
                <Card.Body>
                  <Card.Text>
                    <strong>ID:</strong> {calc.id}
                  </Card.Text>
                  {calc.title && (
                    <Card.Text>
                      <strong>Название:</strong> {calc.title}
                    </Card.Text>
                  )}
                  {calc.text && (
                    <Card.Text>
                      <strong>Описание:</strong> {calc.text}
                    </Card.Text>
                  )}
                  <Card.Text>
                    <strong>Дата создания:</strong> {formatDate(calc.date_create)}
                  </Card.Text>
                  
                  {/* Отображение сохраненных данных для расчета по каждому газу */}
                  {calc.gases && calc.gases.length > 0 && (
                    <div className="mt-3">
                      {calc.gases.map((gasCalc: any, index: number) => (
                        <div key={gasCalc.id || index} className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                          <div className="mb-2">
                            <strong>Газ #{gasCalc.position || index + 1}: {gasCalc.gas?.title || 'Неизвестный газ'}</strong>
                            {gasCalc.gas?.formula && <span className="ms-2 text-muted">({gasCalc.gas.formula})</span>}
                          </div>
                          <div className="row">
                            {(gasCalc.initial_pressure !== null && gasCalc.initial_pressure !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Нач. давление:</strong> {Number(gasCalc.initial_pressure).toFixed(4)} атм
                              </div>
                            )}
                            {(gasCalc.initial_temperature !== null && gasCalc.initial_temperature !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Нач. темп.:</strong> {Number(gasCalc.initial_temperature).toFixed(2)} К
                              </div>
                            )}
                            {(gasCalc.final_temperature !== null && gasCalc.final_temperature !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Кон. темп.:</strong> {Number(gasCalc.final_temperature).toFixed(2)} К
                              </div>
                            )}
                            {(gasCalc.volume !== null && gasCalc.volume !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Объем:</strong> {Number(gasCalc.volume).toFixed(4)} м³
                              </div>
                            )}
                            {(gasCalc.gas_amount !== null && gasCalc.gas_amount !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Кол-во в-ва:</strong> {Number(gasCalc.gas_amount).toFixed(4)} моль
                              </div>
                            )}
                            {(gasCalc.final_pressure !== null && gasCalc.final_pressure !== undefined) && (
                              <div className="col-md-6 mb-2">
                                <strong>Финальное давление:</strong> {Number(gasCalc.final_pressure).toFixed(4)} атм
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default MyCalculationsPage;

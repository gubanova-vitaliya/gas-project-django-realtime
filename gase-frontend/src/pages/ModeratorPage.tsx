import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Spinner, Alert, Badge, Card, Form, Row, Col, Button, Table } from 'react-bootstrap';
import { AppDispatch, RootState } from '../store';
import { ROUTES } from '../Routes';
import axios from 'axios';
import { getDestApi } from '../../target_config';
import './ModeratorPage.css';

interface VesselPressureItem {
  id: number;
  status: string;
  text: string;
  date_create: string;
  date_form: string | null;
  date_complete: string | null;
  creator_login: string;
  moderator_login: string | null;
  calculated_count: number;
}

const ModeratorPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const isModerator = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  const [vesselPressures, setVesselPressures] = useState<VesselPressureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(''); // В формате YYYY-MM-DD для API
  const [dateFromDisplay, setDateFromDisplay] = useState<string>(''); // В формате дд.мм.гггг для отображения
  const [dateTo, setDateTo] = useState<string>(''); // В формате YYYY-MM-DD для API
  const [dateToDisplay, setDateToDisplay] = useState<string>(''); // В формате дд.мм.гггг для отображения
  const [creatorFilter, setCreatorFilter] = useState<string>('');

  // Short polling - обновление каждые 2 секунды
  useEffect(() => {
    if (!isAuthenticated || !isModerator) {
      navigate(ROUTES.HOME);
      return;
    }

    const loadVesselPressures = async () => {
      try {
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');

        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (dateFrom) {
          params.append('date_from', dateFrom);
        }
        if (dateTo) {
          params.append('date_to', dateTo);
        }

        const response = await axios.get(`${apiBase}/api/vessel-pressures?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setVesselPressures(response.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.description || 'Ошибка при загрузке заявок');
      }
    };

    // Загружаем сразу
    setLoading(true);
    loadVesselPressures().finally(() => setLoading(false));

    // Устанавливаем интервал для short polling (каждые 2 секунды)
    const interval = setInterval(() => {
      loadVesselPressures();
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isModerator, navigate, statusFilter, dateFrom, dateTo]);

  // Фильтрация по создателю на фронтенде
  const filteredVesselPressures = vesselPressures.filter((calc) => {
    if (creatorFilter && !calc.creator_login.toLowerCase().includes(creatorFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { variant: string; label: string } } = {
      draft: { variant: 'secondary', label: 'Черновик' },
      formed: { variant: 'primary', label: 'Сформирована' },
      submitted: { variant: 'info', label: 'Отправлена' },
      completed: { variant: 'success', label: 'Завершена' },
      rejected: { variant: 'danger', label: 'Отклонена' },
      deleted: { variant: 'dark', label: 'Удалена' },
    };

    const statusInfo = statusMap[status] || { variant: 'light', label: status };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');

      await axios.put(
        `${apiBase}/api/vessel-pressures/${id}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Обновляем список заявок
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await axios.get(`${apiBase}/api/calculations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCalculations(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.description || 'Ошибка при завершении заявки');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');

      await axios.put(
        `${apiBase}/api/vessel-pressures/${id}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Обновляем список заявок
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await axios.get(`${apiBase}/api/calculations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCalculations(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.description || 'Ошибка при отклонении заявки');
    }
  };

  if (!isAuthenticated || !isModerator) {
    return null;
  }

  return (
    <Container className="moderator-page">
      <h1 className="page-title">Панель модератора</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Фильтры */}
      <Card className="mb-4">
        <Card.Header>
          <strong>Фильтры</strong>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Статус заявки</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="formed">Сформирована</option>
                  <option value="submitted">Отправлена</option>
                  <option value="completed">Завершена</option>
                  <option value="rejected">Отклонена</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Дата от (дд.мм.гггг)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="дд.мм.гггг"
                  value={dateFromDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^[0-9.]*$/.test(value)) {
                      setDateFromDisplay(value);
                      // Конвертируем в YYYY-MM-DD для API
                      if (value) {
                        const parts = value.split('.');
                        if (parts.length === 3) {
                          const day = parts[0].padStart(2, '0');
                          const month = parts[1].padStart(2, '0');
                          const year = parts[2];
                          if (day && month && year) {
                            setDateFrom(`${year}-${month}-${day}`);
                          }
                        }
                      } else {
                        setDateFrom('');
                      }
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Дата до (дд.мм.гггг)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="дд.мм.гггг"
                  value={dateToDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^[0-9.]*$/.test(value)) {
                      setDateToDisplay(value);
                      // Конвертируем в YYYY-MM-DD для API
                      if (value) {
                        const parts = value.split('.');
                        if (parts.length === 3) {
                          const day = parts[0].padStart(2, '0');
                          const month = parts[1].padStart(2, '0');
                          const year = parts[2];
                          if (day && month && year) {
                            setDateTo(`${year}-${month}-${day}`);
                          }
                        }
                      } else {
                        setDateTo('');
                      }
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Создатель (фильтр на фронтенде)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Введите логин создателя"
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-3">
            <Col>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateFromDisplay('');
                  setDateTo('');
                  setDateToDisplay('');
                  setCreatorFilter('');
                }}
              >
                Сбросить фильтры
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && vesselPressures.length === 0 ? (
        <div className="loading-container">
          <Spinner animation="border" />
        </div>
      ) : filteredVesselPressures.length === 0 ? (
        <div className="no-calculations">
          <p>Нет заявок, соответствующих выбранным фильтрам</p>
        </div>
      ) : (
        <Card>
          <Card.Header>
            <strong>Список заявок</strong>
            <span className="ms-3 text-muted">(обновляется каждые 2 секунды)</span>
          </Card.Header>
          <Card.Body>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Статус</th>
                  <th>Создатель</th>
                  <th>Дата создания</th>
                  <th>Дата формирования</th>
                  <th>Дата завершения</th>
                  <th>Модератор</th>
                  <th>Рассчитано газов</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredVesselPressures.map((calc) => (
                  <tr key={calc.id}>
                    <td>{calc.id}</td>
                    <td>{getStatusBadge(calc.status)}</td>
                    <td>{calc.creator_login}</td>
                    <td>{formatDate(calc.date_create)}</td>
                    <td>{formatDate(calc.date_form)}</td>
                    <td>{formatDate(calc.date_complete)}</td>
                    <td>{calc.moderator_login || '-'}</td>
                    <td>
                      <Badge bg={calc.calculated_count > 0 ? 'success' : 'secondary'}>
                        {calc.calculated_count}
                      </Badge>
                    </td>
                    <td>
                      {calc.status === 'formed' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleComplete(calc.id)}
                          >
                            Завершить
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(calc.id)}
                          >
                            Отклонить
                          </Button>
                        </>
                      )}
                      {calc.status === 'completed' && (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => navigate(`${ROUTES.CALCULATION}/${calc.id}`)}
                        >
                          Просмотр
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default ModeratorPage;


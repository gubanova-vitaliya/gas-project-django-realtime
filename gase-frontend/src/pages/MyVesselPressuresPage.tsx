import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Spinner, Alert, Badge, Card, Form, Row, Col, Button, Table } from 'react-bootstrap';
import { AppDispatch, RootState } from '../store';
import { getMyVesselPressuresAsync, clearMyVesselPressures } from '../slices/vesselPressureSlice';
import { ROUTES } from '../Routes';
import axios from 'axios';
import { getDestApi } from '../../target_config';
import './MyVesselPressuresPage.css';

const MyVesselPressuresPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { myVesselPressures, myVesselPressuresLoading, error } = useSelector(
    (state: RootState) => state.vesselPressure
  );
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const isModerator = userProfile?.is_moderator === true;
  
  // Отладочная информация
  useEffect(() => {
    if (userProfile) {
      console.log('User profile:', userProfile);
      console.log('User is_moderator:', userProfile.is_moderator);
      console.log('Is moderator:', isModerator);
    }
  }, [userProfile, isModerator]);

  // Для модераторов - загружаем все заявки отдельно
  const [allCalculations, setAllCalculations] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, formed, deleted
  const [dateFrom, setDateFrom] = useState<string>(''); // В формате YYYY-MM-DD для API (модератор)
  const [dateFromDisplay, setDateFromDisplay] = useState<string>(''); // В формате дд.мм.гггг для отображения
  const [dateTo, setDateTo] = useState<string>(''); // В формате YYYY-MM-DD для API (модератор)
  const [dateToDisplay, setDateToDisplay] = useState<string>(''); // В формате дд.мм.гггг для отображения

  // Загрузка заявок для модераторов (все заявки)
  const loadAllCalculations = async (silent: boolean = false) => {
    // Проверяем, что пользователь действительно модератор перед запросом
    if (!isModerator) {
      return;
    }

    try {
      // Показываем индикатор загрузки только при первой загрузке, не при автоматических обновлениях
      if (!silent) {
        setLoadingAll(true);
      }
      
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.error('Токен авторизации не найден');
        return;
      }

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

      const newData = response.data || [];
      
      // Сравниваем данные перед обновлением, чтобы избежать ненужных перерендеров
      // Сравниваем по JSON строке для простоты (можно оптимизировать)
      const currentDataStr = JSON.stringify(allCalculations);
      const newDataStr = JSON.stringify(newData);
      
      // Обновляем состояние только если данные действительно изменились
      if (currentDataStr !== newDataStr) {
        setAllCalculations(newData);
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке всех заявок:', err);
      // Если ошибка 403, значит пользователь не модератор - не показываем ошибку
      if (err.response?.status === 403) {
        console.warn('Пользователь не имеет прав модератора');
        setAllCalculations([]);
      }
    } finally {
      if (!silent) {
        setLoadingAll(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Проверяем, что профиль загружен перед проверкой роли
    if (!userProfile) {
      return;
    }

    if (isModerator) {
      // Для модераторов загружаем все заявки (первая загрузка с индикатором)
      loadAllCalculations(false);
      
      // Short polling для модераторов - обновление каждые 5 секунд (тихое обновление без индикатора)
      const interval = setInterval(() => {
        // Проверяем роль перед каждым запросом
        if (isModerator) {
          loadAllCalculations(true); // silent = true - без индикатора загрузки
        }
      }, 5000);

      return () => clearInterval(interval);
    } else {
      // Для обычных пользователей загружаем только свои заявки
      dispatch(clearMyVesselPressures());
      dispatch(getMyVesselPressuresAsync());
    }
  }, [dispatch, navigate, isAuthenticated, isModerator, userProfile, statusFilter, dateFrom, dateTo]);

  // Функция для преобразования даты в формат день.месяц.год
  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Функция для парсинга даты из формата день.месяц.год
  const parseDateFromDDMMYYYY = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('.');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // месяцы в JS начинаются с 0
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // По умолчанию не устанавливаем фильтр по датам - показываем все заявки
  // useEffect для установки дат удален - теперь по умолчанию пустые даты

  // Применяем фильтры
  // Для модераторов фильтрация происходит на бэкенде, поэтому просто используем данные как есть
  // Для обычных пользователей применяем фильтрацию на фронтенде
  const vesselPressuresToDisplay = isModerator ? allCalculations : (myVesselPressures || []);
  
  const filteredVesselPressures = vesselPressuresToDisplay.filter((calc: any) => {
    // Для модераторов фильтрация уже применена на бэкенде, просто возвращаем все
    if (isModerator) {
      return true;
    }
    
    // Для обычных пользователей - исключаем удаленные заявки
    if (calc.status === 'deleted') {
      return false;
    }
    
    // Фильтр по статусу (только для обычных пользователей)
    if (statusFilter !== 'all' && calc.status !== statusFilter) {
      return false;
    }

    // Фильтр по дате (только для обычных пользователей)
    if (dateFromDisplay || dateToDisplay) {
      const calcDate = new Date(calc.date_create);
      calcDate.setHours(0, 0, 0, 0);
      
      const fromDate = dateFromDisplay ? parseDateFromDDMMYYYY(dateFromDisplay) : null;
      const toDate = dateToDisplay ? parseDateFromDDMMYYYY(dateToDisplay) : null;
      
      if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
        if (calcDate < fromDate) {
          return false;
        }
      }
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        if (calcDate > toDate) {
          return false;
        }
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


  const handleCardClick = (id: number) => {
    navigate(`${ROUTES.CALCULATION}/${id}`);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    const today = formatDateToDDMMYYYY(new Date());
    const todayYYYYMMDD = new Date().toISOString().split('T')[0];
    
    setDateFromDisplay(today);
    setDateToDisplay(today);
    
    if (isModerator) {
      setDateFrom(todayYYYYMMDD);
      setDateTo(todayYYYYMMDD);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');

      // Сначала запускаем расчет
      try {
        const calculateResponse = await axios.post(
          `${apiBase}/api/vessel-pressures/${id}/calculate`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Давление сосуда выполнено:', calculateResponse.data);
        // Убрано всплывающее сообщение
      } catch (calcErr: any) {
        console.error('Ошибка при расчете давления сосуда заявки:', calcErr);
        setActionError('Ошибка при расчете давления сосуда: ' + (calcErr.response?.data?.error || calcErr.message));
        setTimeout(() => setActionError(null), 5000);
        // Продолжаем выполнение, даже если расчет не удался
      }

      // Затем завершаем заявку
      await axios.put(
        `${apiBase}/api/vessel-pressures/${id}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Сразу обновляем локальное состояние, чтобы не ждать следующий поллинг
      if (isModerator) {
        // Обновляем локальный список - меняем статус заявки
        setAllCalculations(prev => 
          prev.map(calc => 
            calc.id === id ? { ...calc, status: 'completed' } : calc
          )
        );
        // Также перезагружаем данные с сервера
        await loadAllCalculations(true);
      } else {
        await dispatch(getMyVesselPressuresAsync());
      }
    } catch (err: any) {
      console.error('Ошибка при завершении заявки:', err);
      setActionError('Ошибка при завершении заявки: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setActionError(null), 5000);
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

      // Сразу обновляем локальное состояние
      if (isModerator) {
        setAllCalculations(prev => 
          prev.map(calc => 
            calc.id === id ? { ...calc, status: 'rejected' } : calc
          )
        );
        await loadAllCalculations(true);
      } else {
        await dispatch(getMyVesselPressuresAsync());
      }
    } catch (err: any) {
      console.error('Ошибка при отклонении заявки:', err);
      setActionError('Ошибка при отклонении заявки: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setActionError(null), 5000);
    }
  };


  if ((isModerator && loadingAll) || (!isModerator && myVesselPressuresLoading)) {
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
      <h1 className="page-title">
        {isModerator ? 'Все заявки' : 'Мои заявки'}
      </h1>

      {/* Общий подсчет рассчитанных заявок для модератора */}
      {isModerator && filteredVesselPressures.length > 0 && (
        <div className="mb-3">
          <Badge bg="info" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            Всего заявок: {filteredVesselPressures.length} | 
            Рассчитано: {filteredVesselPressures.filter((calc: any) => 
              calc.calculated_count !== undefined && calc.calculated_count > 0
            ).length} | 
            Не рассчитано: {filteredVesselPressures.filter((calc: any) => 
              calc.calculated_count === undefined || calc.calculated_count === 0
            ).length}
          </Badge>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" dismissible onClose={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      {/* Фильтры */}
      <Card className="mb-4">
        <Card.Header>
          <strong>Фильтры</strong>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={isModerator ? 3 : 4}>
              <Form.Group>
                <Form.Label>Статус заявки</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="formed">Сформирована</option>
                  <option value="completed">Завершена</option>
                  <option value="rejected">Отклонена</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={isModerator ? 3 : 4}>
              <Form.Group>
                <Form.Label>Дата от (дд.мм.гггг)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="дд.мм.гггг"
                  value={dateFromDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^[0-9.]*$/.test(value)) {
                      if (isModerator) {
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
                      } else {
                        setDateFromDisplay(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isModerator) {
                      const value = e.target.value;
                      if (value && !parseDateFromDDMMYYYY(value)) {
                        setDateFromDisplay('');
                      }
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={isModerator ? 3 : 4}>
              <Form.Group>
                <Form.Label>Дата до (дд.мм.гггг)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="дд.мм.гггг"
                  value={dateToDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^[0-9.]*$/.test(value)) {
                      if (isModerator) {
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
                      } else {
                        setDateToDisplay(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isModerator) {
                      const value = e.target.value;
                      if (value && !parseDateFromDDMMYYYY(value)) {
                        setDateToDisplay('');
                      }
                    }
                  }}
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

      {(!isModerator && (!myVesselPressures || myVesselPressures.length === 0)) || 
       (isModerator && allCalculations.length === 0) ? (
        <div className="no-calculations">
          <p>{isModerator ? 'Нет заявок' : 'У вас пока нет заявок'}</p>
        </div>
      ) : filteredVesselPressures.length === 0 ? (
        <div className="no-calculations">
          <p>Нет заявок, соответствующих выбранным фильтрам</p>
        </div>
      ) : (
        <Card className="calculations-table-card">
          <Card.Body className="p-0">
            <Table hover responsive className="calculations-table mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Номер</th>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Дата создания</th>
                  {isModerator && <th>Дата формирования</th>}
                  {isModerator && <th>Дата завершения</th>}
                  {isModerator && <th>Создатель</th>}
                  {isModerator && <th>Модератор</th>}
                  <th>Газы</th>
                  {isModerator && <th>Действия</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVesselPressures.map((calc: any) => (
                  <tr 
                    key={calc.id} 
                    className="calculation-row"
                    onClick={() => handleCardClick(calc.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="text-muted">{calc.id}</td>
                    <td>
                      <strong>#{calc.vessel_pressure_number || calc.id}</strong>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '200px' }} title={calc.text || calc.title || ''}>
                        {calc.text || calc.title || '-'}
                      </div>
                    </td>
                    <td>{getStatusBadge(calc.status)}</td>
                    <td>{formatDate(calc.date_create)}</td>
                    {isModerator && (
                      <td>{calc.date_form ? formatDate(calc.date_form) : '-'}</td>
                    )}
                    {isModerator && (
                      <td>{calc.date_complete ? formatDate(calc.date_complete) : '-'}</td>
                    )}
                    {isModerator && (
                      <td>
                        <span className="text-muted">{calc.creator_login || '-'}</span>
                      </td>
                    )}
                    {isModerator && (
                      <td>
                        <span className="text-muted">{calc.moderator_login || '-'}</span>
                      </td>
                    )}
                    <td>
                      <Badge bg={calc.calculated_count > 0 ? 'success' : 'secondary'}>
                        {calc.calculated_count !== undefined ? calc.calculated_count : 0} / {calc.gases?.length || 0}
                      </Badge>
                    </td>
                    {isModerator && (
                      <td>
                        {calc.status === 'formed' && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-1 mb-1"
                              onClick={() => handleComplete(calc.id)}
                            >
                              Завершить
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="mb-1"
                              onClick={() => handleReject(calc.id)}
                            >
                              Отклонить
                            </Button>
                          </div>
                        )}
                        {calc.status !== 'formed' && <span className="text-muted">-</span>}
                      </td>
                    )}
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

export default MyVesselPressuresPage;

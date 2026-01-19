import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loginUserAsync, getUserProfileAsync, clearError } from '../slices/userSlice';
import { clearCart, setCartCount } from '../slices/cartSlice';
import { clearVesselPressure, setAppId, setCount, clearMyVesselPressures } from '../slices/vesselPressureSlice';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../Routes';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ login: '', password: '' });
  const error = useSelector((state: RootState) => state.user.error);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  // Перенаправление, если пользователь уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.GASES);
    }
  }, [isAuthenticated, navigate]);

  // Очистка ошибки при размонтировании
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Обработчик изменения полей
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Очищаем ошибку при изменении полей
    if (error) {
      dispatch(clearError());
    }
  };

  // Обработчик отправки формы
  // Демонстрирует использование async thunk в компоненте
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.login && formData.password) {
      // ИСПОЛЬЗОВАНИЕ REDUX: Вызов асинхронного действия
      // dispatch(loginUserAsync()) возвращает Promise, который разрешается с результатом действия
      // Внутри loginUserAsync происходит HTTP-запрос через axios.post()
      const result = await dispatch(loginUserAsync(formData));
      
      // Проверяем результат через .match() - это типобезопасный способ проверки
      // result.type будет равен 'user/loginUserAsync/fulfilled' при успехе
      if (loginUserAsync.fulfilled.match(result)) {
        // Сбрасываем корзину и заявку при входе нового пользователя
        // ВАЖНО: Очищаем ДО загрузки профиля, чтобы не было конфликтов
        
        // Вызов нескольких синхронных действий для очистки состояния
        dispatch(clearCart());
        dispatch(setCartCount({ count: 0, draftId: null }));
        dispatch(clearVesselPressure());
        dispatch(clearMyVesselPressures()); // Очищаем список заявок
        dispatch(setAppId(null));
        dispatch(setCount(0));
        
        // Загружаем профиль после успешной авторизации (ещё один async thunk)
        await dispatch(getUserProfileAsync()); // Внутри происходит axios.get()
        
        // Небольшая задержка, чтобы убедиться, что очистка применилась
        setTimeout(() => {
          navigate(ROUTES.GASES);
        }, 100);
      }
    }
  };

  return (
    <Container className="login-container">
      <div className="login-form-wrapper">
        <h2 className="login-title">Рады снова Вас видеть!</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="login" className="mb-3">
            <Form.Label>Имя пользователя</Form.Label>
            <Form.Control
              type="text"
              name="login"
              value={formData.login}
              onChange={handleChange}
              placeholder="Введите имя пользователя"
              required
            />
          </Form.Group>
          <Form.Group controlId="password" className="mb-4">
            <Form.Label>Пароль</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="w-100">
            Войти
          </Button>
        </Form>
      </div>
    </Container>
  );
};

export default LoginPage;


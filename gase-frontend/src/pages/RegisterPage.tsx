import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { registerUserAsync, clearError } from '../slices/userSlice';
import { clearCart, setCartCount } from '../slices/cartSlice';
import { clearCalculation, setAppId, setCount, clearMyCalculations } from '../slices/calculationSlice';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../Routes';
import './RegisterPage.css';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    login: '',
    password: '',
    name: '',
    email: '',
  });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  
  const error = useSelector((state: RootState) => state.user.error);
  const loading = useSelector((state: RootState) => state.user.loading);
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

  // Валидация формы (упрощенная, без строгих проверок)
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Минимальная проверка на заполненность основных полей
    if (!formData.login || formData.login.trim().length === 0) {
      errors.login = 'Логин обязателен для заполнения';
    }

    if (!formData.password || formData.password.trim().length === 0) {
      errors.password = 'Пароль обязателен для заполнения';
    }

    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = 'Имя обязательно для заполнения';
    }

    // Убраны все проверки: длины пароля, формата email, совпадения паролей

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработчик изменения полей
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Очищаем ошибки валидации и общую ошибку
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
    if (error) {
      dispatch(clearError());
    }
  };

  // Обработчик отправки формы
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await dispatch(registerUserAsync({
      login: formData.login,
      password: formData.password,
      name: formData.name,
      email: formData.email || undefined,
    }));

    if (registerUserAsync.fulfilled.match(result)) {
      // ВАЖНО: Удаляем старый токен из localStorage при регистрации
      // Это гарантирует, что новый пользователь не будет видеть данные старого
      localStorage.removeItem('auth_token');
      
      // Очищаем все данные перед переходом на страницу входа
      dispatch(clearCart());
      dispatch(setCartCount({ count: 0, draftId: null }));
      dispatch(clearCalculation());
      dispatch(clearMyCalculations()); // Очищаем список заявок
      dispatch(setAppId(null));
      dispatch(setCount(0));
      // После успешной регистрации перенаправляем на страницу входа
      navigate(ROUTES.LOGIN, { state: { message: 'Регистрация успешна! Войдите в систему.' } });
    }
  };

  return (
    <Container className="register-container">
      <div className="register-form-wrapper">
        <h2 className="register-title">Регистрация</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="login" className="mb-3">
            <Form.Label>Логин *</Form.Label>
            <Form.Control
              type="text"
              name="login"
              value={formData.login}
              onChange={handleChange}
              placeholder="Введите логин"
              required
              isInvalid={!!validationErrors.login}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.login}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group controlId="name" className="mb-3">
            <Form.Label>Имя *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Введите имя"
              required
              isInvalid={!!validationErrors.name}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group controlId="email" className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Введите email (необязательно)"
            />
          </Form.Group>

          <Form.Group controlId="password" className="mb-4">
            <Form.Label>Пароль *</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              required
              isInvalid={!!validationErrors.password}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.password}
            </Form.Control.Feedback>
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>

          <div className="text-center">
            <span>Уже есть аккаунт? </span>
            <Link to={ROUTES.LOGIN}>Войти</Link>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default RegisterPage;


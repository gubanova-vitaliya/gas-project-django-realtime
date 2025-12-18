import { FC, useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { AppDispatch, RootState } from '../store';
import { getUserProfileAsync, updateUserProfileAsync, clearError } from '../slices/userSlice';
import { ROUTES } from '../Routes';
import './ProfilePage.css';

const ProfilePage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { profile, loading, error, isAuthenticated } = useSelector((state: RootState) => state.user);
  const [formData, setFormData] = useState({
    login: '',
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    dispatch(getUserProfileAsync());
  }, [dispatch, navigate, isAuthenticated]);

  useEffect(() => {
    if (profile) {
      setFormData({
        login: profile.login || '',
        name: profile.name || '',
        email: profile.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [profile]);

  const validatePassword = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (formData.newPassword && formData.newPassword.length < 6) {
      errors.newPassword = 'Пароль должен содержать минимум 6 символов';
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (passwordErrors[name]) {
      setPasswordErrors({ ...passwordErrors, [name]: '' });
    }
    if (error) {
      dispatch(clearError());
    }
    if (updateSuccess) {
      setUpdateSuccess(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    
    // Валидация пароля (если изменяется)
    if (formData.newPassword && !validatePassword()) {
      return;
    }

    const updateData: { login?: string } = {};
    if (formData.login !== profile?.login) {
      updateData.login = formData.login;
    }

    if (Object.keys(updateData).length > 0) {
      const result = await dispatch(updateUserProfileAsync(updateData));
      if (updateUserProfileAsync.fulfilled.match(result)) {
        setUpdateSuccess(true);
        // Обновляем профиль после изменения
        await dispatch(getUserProfileAsync());
      }
    }

    // TODO: Добавить изменение пароля через отдельный эндпоинт (если есть)
    // if (formData.newPassword) {
    //   await dispatch(updatePasswordAsync({
    //     currentPassword: formData.currentPassword,
    //     newPassword: formData.newPassword,
    //   }));
    // }
  };

  if (loading && !profile) {
    return (
      <Container className="profile-page">
        <div className="loading-container">
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="profile-page">
      <h1 className="page-title">Личный кабинет</h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {updateSuccess && <Alert variant="success">Профиль успешно обновлен!</Alert>}

      <Card>
        <Card.Body>
          <Form onSubmit={handleUpdateProfile}>
            <Form.Group controlId="login" className="mb-3">
              <Form.Label>Логин</Form.Label>
              <Form.Control
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="name" className="mb-3">
              <Form.Label>Имя</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled
              />
              <Form.Text className="text-muted">
                Имя можно изменить только при регистрации
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="email" className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
              />
              <Form.Text className="text-muted">
                Email можно изменить только при регистрации
              </Form.Text>
            </Form.Group>

            <hr />

            <h5>Изменить пароль</h5>

            <Form.Group controlId="currentPassword" className="mb-3">
              <Form.Label>Текущий пароль</Form.Label>
              <Form.Control
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Введите текущий пароль"
              />
            </Form.Group>

            <Form.Group controlId="newPassword" className="mb-3">
              <Form.Label>Новый пароль</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Введите новый пароль"
                isInvalid={!!passwordErrors.newPassword}
              />
              <Form.Control.Feedback type="invalid">
                {passwordErrors.newPassword}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="confirmPassword" className="mb-4">
              <Form.Label>Подтверждение пароля</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Подтвердите новый пароль"
                isInvalid={!!passwordErrors.confirmPassword}
              />
              <Form.Control.Feedback type="invalid">
                {passwordErrors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>

            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProfilePage;


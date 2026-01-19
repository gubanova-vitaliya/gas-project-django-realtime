import { FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import NavDropdown from "react-bootstrap/NavDropdown";
import { ROUTES, ROUTE_LABELS } from "../Routes";
import { AppDispatch, RootState } from "../store";
import { logoutUserAsync } from "../slices/userSlice";
import { getGasesList, setSearchValue, clearFilters } from "../slices/gasSlice";
import { clearVesselPressure, clearMyVesselPressures } from "../slices/vesselPressureSlice";
import { clearCart } from "../slices/cartSlice";
import "./Navbar.css";

export const AppNavbar: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const username = useSelector((state: RootState) => state.user.username);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const isModerator = userProfile?.is_moderator === true;

  // Обработчик выхода
  const handleExit = async () => {
    await dispatch(logoutUserAsync());
    // Сброс фильтров и поиска
    dispatch(setSearchValue(''));
    dispatch(clearFilters());
    // Сброс конструктора заявки
    dispatch(clearVesselPressure());
    dispatch(clearMyVesselPressures()); // Очищаем список заявок
    dispatch(clearCart());
    navigate(ROUTES.GASES);
    await dispatch(getGasesList());
  };

  return (
    <Navbar expand="lg" bg="dark" variant="dark" sticky="top" className="app-navbar">
      <Container fluid>
        <Navbar.Brand as={Link} to={ROUTES.HOME}>
          GasProject
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to={ROUTES.HOME}>
              {ROUTE_LABELS.HOME}
            </Nav.Link>
            <Nav.Link as={Link} to={ROUTES.GASES}>
              {ROUTE_LABELS.GASES}
            </Nav.Link>
            {isAuthenticated && (
              <Nav.Link as={Link} to={ROUTES.MY_CALCULATIONS}>
                {ROUTE_LABELS.MY_CALCULATIONS}
              </Nav.Link>
            )}
          </Nav>
          <Nav className="ms-auto align-items-center">
            {isAuthenticated && (
              <>
                <NavDropdown title={username || 'Пользователь'} id="user-dropdown" className="me-2">
                  <NavDropdown.Item as={Link} to={ROUTES.PROFILE}>
                    {ROUTE_LABELS.PROFILE}
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleExit}>
                    Выйти
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Button as={Link} to={ROUTES.REGISTER} variant="outline-light" className="me-2">
                  Регистрация
                </Button>
                <Button as={Link} to={ROUTES.LOGIN} variant="outline-light">
                  Войти
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

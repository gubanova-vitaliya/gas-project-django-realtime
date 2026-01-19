/**
 * КОМПОНЕНТ: Страница списка газов
 * 
 * Демонстрирует использование Redux в React-компоненте:
 * 1. useDispatch - для вызова действий (actions)
 * 2. useSelector - для получения данных из store
 * 3. Кастомные хуки-селекторы для удобного доступа к данным
 * 4. Диспатч асинхронных действий через dispatch(asyncThunk())
 */
import "./GasesPage.css";
import { FC, useEffect, useLayoutEffect, useRef } from "react";
import { Spinner, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux"; // Redux хуки для работы с store
import { useNavigate } from "react-router-dom";
import { ROUTE_LABELS, ROUTES } from "../Routes";
import { RootState } from "../store"; // Типы для типобезопасности
import CartIcon from "../components/CartIcon.svelte";
import {
  useFilteredGases,      // Кастомный селектор (хук) для получения отфильтрованных газов
  useGasLoading,         // Кастомный селектор для состояния загрузки
  useGasError,           // Кастомный селектор для ошибок
  useAllGases,           // Кастомный селектор для всех газов
  useGasFilters,         // Кастомный селектор для фильтров
  useGasSearchValue,     // Кастомный селектор для значения поиска
  getGasesList,          // Асинхронное действие (async thunk) для загрузки списка газов
  setSearchValue,        // Синхронное действие для обновления значения поиска
} from "../slices/gasSlice";
import { GasFilters } from "../components/GasFilters";
import { GasCardItem } from "../components/GasCardItem";
import { Gas } from "../components/GasCard";
import { useCartData } from "../hooks/useCartData";
import { AppDispatch } from "../store"; // Типизированный dispatch

export const GasesPage: FC = () => {
  // ИСПОЛЬЗОВАНИЕ REDUX:
  // useDispatch - хук для вызова действий (изменение состояния)
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cartIconRef = useRef<HTMLDivElement>(null);
  
  // ИСПОЛЬЗОВАНИЕ СЕЛЕКТОРОВ (получение данных из Redux store):
  // Кастомные хуки-селекторы - удобный способ доступа к данным с типизацией
  const gases = useFilteredGases(); // Получаем отфильтрованные газы из state.gas.filteredGases
  const allGases = useAllGases();   // Получаем все газы из state.gas.gases
  const filters = useGasFilters();  // Получаем фильтры из state.gas.filters
  const loading = useGasLoading();  // Получаем состояние загрузки из state.gas.loading
  const error = useGasError();      // Получаем ошибку из state.gas.error
  const searchValue = useGasSearchValue(); // Получаем значение поиска из state.gas.searchValue
  
  // Прямое использование useSelector для доступа к другим слайсам
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  
  // Получаем количество давления сосуда в журнале из другого слайса (vesselPressure)
  const journalCount = useSelector((state: RootState) => state.vesselPressure.count || 0);
  
  // Проверяем, активны ли фильтры
  const hasActiveFilters = filters.minMolarMass !== undefined || filters.maxMolarMass !== undefined;

  // Загружаем данные корзины
  useCartData();

  // Монтируем Svelte компонент иконки корзины
  useLayoutEffect(() => {
    if (cartIconRef.current && isAuthenticated) {
      const cartIcon = new CartIcon({
        target: cartIconRef.current,
        props: { navigate },
      });
      return () => {
        if (cartIcon && typeof cartIcon.$destroy === 'function') {
          cartIcon.$destroy();
        }
      };
    }
  }, [navigate, isAuthenticated]);

  // ЗАГРУЗКА ДАННЫХ ЧЕРЕЗ REDUX THUNK:
  // При монтировании компонента вызываем асинхронное действие getGasesList()
  // Это действие внутри использует axios для HTTP-запроса к API
  useEffect(() => {
    // dispatch(asyncThunk()) автоматически обрабатывает pending/fulfilled/rejected состояния
    dispatch(getGasesList()); // Внутри происходит HTTP-запрос через axios/fetch
  }, [dispatch]);

  return (
    <div className="gases-page">
      <div className="page-header">
        <h1>{ROUTE_LABELS.GASES}</h1>
        {isAuthenticated && (
          <div ref={cartIconRef} className="cart-icon-wrapper"></div>
        )}
      </div>


      {/* Поле поиска */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск по названию или формуле"
          value={searchValue}
          // ИСПОЛЬЗОВАНИЕ REDUX: Вызов синхронного действия при изменении значения
          // setSearchValue - это action creator, созданный через createSlice
          // При вызове обновляется state.gas.searchValue и применяются фильтры
          onChange={(e) => {
            dispatch(setSearchValue(e.target.value)); // Синхронное обновление состояния
          }}
          className="search-input"
        />
        <Button
          variant="primary"
          // ИСПОЛЬЗОВАНИЕ REDUX: Вызов асинхронного действия по клику
          // getGasesList() внутри выполнит HTTP-запрос через axios/fetch
          // Автоматически установится loading = true, затем fulfilled/rejected
          onClick={() => dispatch(getGasesList())}
          disabled={loading} // Кнопка неактивна во время загрузки
        >
          Найти
        </Button>
      </div>

      <GasFilters />

      {/* Информация о результатах фильтрации */}
      {!loading && !error && hasActiveFilters && (
        <div className="filter-results-info">
          <span className="results-count">
            Найдено: <strong>{gases.length}</strong> из <strong>{allGases.length}</strong> газов
          </span>
        </div>
      )}

      {loading && (
        <div className="loading-bg">
          <Spinner animation="border" />
        </div>
      )}

      {error && (
        <div className="error-message">
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && gases.length === 0 && (
        <div className="no-results">
          <h3>Газы не найдены</h3>
          <p>Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {!loading && !error && gases.length > 0 && (
        <div className={`grid ${hasActiveFilters ? 'filtered' : ''}`}>
          {gases.map((gas: Gas) => (
            <GasCardItem key={gas.id} gas={gas} />
          ))}
        </div>
      )}
    </div>
  );
};

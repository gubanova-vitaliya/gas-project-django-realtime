/**
 * REDUX STORE: Централизованное хранилище состояния приложения
 * 
 * Этот файл демонстрирует:
 * 1. Настройку Redux store через configureStore
 * 2. Объединение всех слайсов через combineReducers
 * 3. Экспорт типов для типобезопасности
 * 
 * Store содержит всё глобальное состояние приложения:
 * - gasCalculation: данные расчетов
 * - gas: список газов и фильтры
 * - cart: корзина покупок
 * - user: данные пользователя и авторизация
 * - vesselPressure: давление сосуда и заявки
 */
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import gasCalculationReducer from "./slices/dataSlice";
import gasReducer from "./slices/gasSlice";
import cartReducer from "./slices/cartSlice";
import userReducer from "./slices/userSlice";
import vesselPressureReducer from "./slices/vesselPressureSlice";

/**
 * Объединение всех редьюсеров в единое дерево состояния
 * 
 * combineReducers объединяет все слайсы так:
 * {
 *   gasCalculation: { ... },
 *   gas: { ... },
 *   cart: { ... },
 *   user: { ... },
 *   vesselPressure: { ... }
 * }
 */
const rootReducer = combineReducers({
  gasCalculation: gasCalculationReducer,
  gas: gasReducer,
  cart: cartReducer,
  user: userReducer,
  vesselPressure: vesselPressureReducer,
});

/**
 * Создание и настройка Redux store
 * 
 * configureStore настраивает store с:
 * - Автоматической настройкой Redux Thunk (для async actions)
 * - Интеграцией с Redux DevTools (для отладки)
 * - Проверками для разработки (serializableCheck)
 */
const store = configureStore({
  reducer: rootReducer,
  // Включаем Redux DevTools для отладки (только в development)
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Отключаем проверку для определенных типов действий, если нужно
        ignoredActions: [],
      },
    }),
});

/**
 * Экспорт типов для типобезопасности
 * 
 * RootState - тип всего состояния store
 * AppDispatch - тип dispatch функции
 * 
 * Используются в компонентах для типобезопасного доступа к store:
 * const state = useSelector((state: RootState) => state.user);
 * const dispatch = useDispatch<AppDispatch>();
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;


/**
 * ХУК: Загрузка данных корзины через Axios и обновление Redux store
 * 
 * Демонстрирует:
 * - Использование axios.get() для получения данных
 * - Прямое использование dispatch (без createAsyncThunk) для простых операций
 * - Обработку ошибок и проверку авторизации
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./useTypedRedux";
import { setCartCount } from "../slices/cartSlice";
import { setAppId, setCount } from "../slices/vesselPressureSlice";
import { getCartCount } from "../modules/cartApi";
import axios from "axios"; // Axios для HTTP-запросов
import { getDestApi } from "../../target_config";

/**
 * Функция для загрузки данных корзины
 * Может быть вызвана из любого места для обновления корзины
 * 
 * Примечание: Здесь axios используется напрямую, не через createAsyncThunk
 * Это подходит для простых операций, где не нужна обработка pending/fulfilled/rejected
 */
export const loadCartData = async (dispatch: any) => {
  const isAuthenticated = localStorage.getItem('auth_token') !== null;
  
  if (!isAuthenticated) {
    dispatch(setCartCount({ count: 0, draftId: null }));
    return;
  }

  try {
    const apiBase = getDestApi();
    const token = localStorage.getItem('auth_token');
    
    if (!apiBase || !token) {
      dispatch(setCartCount({ count: 0, draftId: null }));
      return;
    }

    // ИСПОЛЬЗОВАНИЕ AXIOS: GET-запрос для получения данных корзины
    // axios.get(url, config) - выполняет GET-запрос с заголовками
    const response = await axios.get(`${apiBase}/api/cart`, {
      headers: {
        Authorization: `Bearer ${token}`, // JWT токен в заголовке
      },
    });

    // Извлекаем данные из ответа
    // response.data - это объект с данными, возвращёнными сервером
    const { draft_id, count } = response.data;
    
    // ИСПОЛЬЗОВАНИЕ REDUX: Обновление состояния через dispatch синхронных действий
    // Устанавливаем счетчик только если есть черновик
    if (draft_id) {
      const finalCount = count !== undefined && count !== null ? count : 0;
      dispatch(setCartCount({ count: finalCount, draftId: draft_id })); // Обновляем корзину
      dispatch(setAppId(draft_id)); // Обновляем ID заявки
      dispatch(setCount(finalCount)); // Обновляем счётчик
    } else {
      // Если нет черновика, сбрасываем все в 0
      dispatch(setCartCount({ count: 0, draftId: null }));
      dispatch(setAppId(null));
      dispatch(setCount(0));
    }
  } catch (error) {
    // Обработка ошибок: при ошибке сети или 404 сбрасываем корзину
    console.warn("Error loading cart data:", error);
    dispatch(setCartCount({ count: 0, draftId: null }));
  }
};

/**
 * Хук для инициализации журнала расчетов
 * Загружает данные корзины из API
 */
export const useCartData = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state: any) => state.user?.isAuthenticated);

  useEffect(() => {
    // Сначала устанавливаем счетчик в 0 при монтировании
    dispatch(setCartCount({ count: 0, draftId: null }));
    // Затем загружаем данные корзины
    loadCartData(dispatch);
  }, [dispatch, isAuthenticated]);
};


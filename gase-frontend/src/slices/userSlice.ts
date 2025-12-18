/**
 * REDUX SLICE: Управление состоянием пользователя
 * 
 * Этот файл демонстрирует использование:
 * 1. Redux Toolkit (createSlice, createAsyncThunk) для управления состоянием
 * 2. Axios для HTTP-запросов к API
 * 3. Асинхронных действий через createAsyncThunk
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios'; // Axios для HTTP-запросов
import { getDestApi } from '../../target_config';
import { clearCalculation } from './calculationSlice';
import { clearFilters, setSearchValue } from './gasSlice';

interface UserProfile {
  login?: string;
  name?: string;
  email?: string;
  uuid?: string;
  role?: string;
}

/**
 * Интерфейс состояния пользователя в Redux Store
 * Все поля этого состояния доступны через useSelector в компонентах
 */
interface UserState {
  username: string;
  name: string;
  email: string;
  uuid: string;
  isAuthenticated: boolean;
  error: string | null;
  token: string | null;
  profile: UserProfile | null;
  loading: boolean;
}

const initialState: UserState = {
  username: '',
  name: '',
  email: '',
  uuid: '',
  isAuthenticated: false,
  error: null,
  token: null,
  profile: null,
  loading: false,
};

/**
 * ASYNC THUNK: Асинхронное действие для авторизации пользователя
 * 
 * createAsyncThunk создаёт асинхронное действие, которое:
 * 1. Генерирует три типа действий: pending, fulfilled, rejected
 * 2. Автоматически обрабатывает состояния загрузки
 * 3. Позволяет обрабатывать ошибки через rejectWithValue
 * 
 * Использование Axios:
 * - axios.post() выполняет POST-запрос к API
 * - response.data содержит данные ответа сервера
 * - При ошибке axios автоматически выбрасывает исключение
 * 
 * В компонентах вызывается через: dispatch(loginUserAsync({ login, password }))
 */
export const loginUserAsync = createAsyncThunk(
  'user/loginUserAsync',
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      
      // HTTP-запрос через Axios: POST запрос на эндпоинт /api/auth/login
      // Axios автоматически сериализует объект в JSON и устанавливает заголовки
      const response = await axios.post(`${apiBase}/api/auth/login`, {
        login: credentials.login,
        password: credentials.password,
      });
      
      // Сохраняем токен в localStorage для последующих запросов
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      
      // Возвращаем данные для fulfilled reducer
      // Эти данные будут доступны в action.payload в extraReducers
      return {
        username: response.data.user?.login || credentials.login,
        name: response.data.user?.name || '',
        email: response.data.user?.email || '',
        uuid: response.data.user?.uuid || '',
        token: response.data.access_token,
      };
    } catch (error: any) {
      // При ошибке возвращаем отклонённое значение
      // Это значение будет доступно в action.payload в rejected reducer
      return rejectWithValue('Ошибка авторизации');
    }
  }
);

/**
 * ASYNC THUNK: Регистрация нового пользователя
 * 
 * Демонстрирует:
 * - Условное формирование тела запроса (email опционален)
 * - Настройку заголовков через третий параметр axios.post()
 * - Детальную обработку ошибок из response
 */
export const registerUserAsync = createAsyncThunk(
  'user/registerUserAsync',
  async (data: { login: string; password: string; name: string; email?: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      // Формируем объект запроса, включая email только если он есть
      const requestData: any = {
        login: data.login,
        password: data.password,
        name: data.name,
      };
      
      // Добавляем email только если он не пустой
      if (data.email && data.email.trim() !== '') {
        requestData.email = data.email.trim();
      }
      
      // Axios POST с явным указанием заголовков
      // Третий параметр - конфигурация запроса (headers, params, timeout и т.д.)
      const response = await axios.post(`${apiBase}/api/auth/register`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.data;
    } catch (error: any) {
      // Более детальная обработка ошибок
      let message = 'Ошибка регистрации';
      if (error.response) {
        // Сервер вернул ответ с ошибкой
        if (error.response.data?.description) {
          message = error.response.data.description;
        } else if (error.response.data?.error) {
          message = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          message = error.response.data;
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        message = 'Не удалось подключиться к серверу';
      }
      console.error('Registration error:', error);
      return rejectWithValue(message);
    }
  }
);

/**
 * ASYNC THUNK: Получение профиля пользователя
 * 
 * Демонстрирует:
 * - GET-запрос через axios.get()
 * - Использование JWT токена в заголовке Authorization
 * - Проверку наличия токена перед запросом
 */
export const getUserProfileAsync = createAsyncThunk(
  'user/getUserProfileAsync',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return rejectWithValue('Нет токена авторизации');
      }
      
      // GET-запрос с токеном авторизации в заголовке
      // Axios автоматически добавит заголовок Authorization: Bearer <token>
      const response = await axios.get(`${apiBase}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при загрузке профиля');
    }
  }
);

// Обновление профиля пользователя
export const updateUserProfileAsync = createAsyncThunk(
  'user/updateUserProfileAsync',
  async (data: { login?: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return rejectWithValue('Нет токена авторизации');
      }
      
      await axios.put(`${apiBase}/api/users/me`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Ошибка при обновлении профиля';
      return rejectWithValue(message);
    }
  }
);

// Асинхронное действие для деавторизации
export const logoutUserAsync = createAsyncThunk(
  'user/logoutUserAsync',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        await axios.post(
          `${apiBase}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      localStorage.removeItem('auth_token');
      return {};
    } catch (error: any) {
      // Даже при ошибке удаляем токен
      localStorage.removeItem('auth_token');
      return rejectWithValue('Ошибка при выходе из системы');
    }
  }
);

/**
 * REDUX SLICE: Определение слайса состояния пользователя
 * 
 * createSlice автоматически генерирует:
 * - action creators для каждого reducer
 * - action types на основе имени слайса
 * 
 * reducers - синхронные действия (изменяют состояние напрямую)
 * extraReducers - обработка асинхронных действий из createAsyncThunk
 */
const userSlice = createSlice({
  name: 'user', // Имя слайса (используется для генерации action типов)
  initialState,
  reducers: {
    // СИНХРОННЫЕ РЕДЬЮСЕРЫ: изменяют состояние напрямую, без асинхронных операций
    // Проверка токена при загрузке приложения
    checkAuth(state) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        // Загрузим профиль позже через getUserProfileAsync
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  // EXTRA REDUCERS: обработка асинхронных действий из createAsyncThunk
  // Каждое асинхронное действие имеет 3 состояния: pending, fulfilled, rejected
  extraReducers: (builder) => {
    builder
      // PENDING: запрос отправлен, ожидаем ответ
      // Сбрасываем ошибку и устанавливаем loading = true
      .addCase(loginUserAsync.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      // FULFILLED: запрос успешно выполнен
      // action.payload содержит данные, возвращённые из async функции в createAsyncThunk
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.username = action.payload.username; // Данные из response.data
        state.name = action.payload.name;
        state.email = action.payload.email;
        state.uuid = action.payload.uuid;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.error = null;
        state.loading = false;
      })
      // REJECTED: запрос завершился ошибкой
      // action.payload содержит значение из rejectWithValue()
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.error = action.payload as string; // 'Ошибка авторизации'
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
      })
      .addCase(registerUserAsync.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      .addCase(registerUserAsync.fulfilled, (state) => {
        state.error = null;
        state.loading = false;
      })
      .addCase(registerUserAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(getUserProfileAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserProfileAsync.fulfilled, (state, action) => {
        state.profile = {
          ...action.payload,
          role: action.payload.role,
        };
        state.username = action.payload.login || '';
        state.name = action.payload.name || '';
        state.email = action.payload.email || '';
        state.uuid = action.payload.uuid || '';
        state.loading = false;
      })
      .addCase(getUserProfileAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(updateUserProfileAsync.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      .addCase(updateUserProfileAsync.fulfilled, (state, action) => {
        if (action.payload.login) {
          state.username = action.payload.login;
          if (state.profile) {
            state.profile.login = action.payload.login;
          }
        }
        state.loading = false;
      })
      .addCase(updateUserProfileAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(logoutUserAsync.fulfilled, (state, action) => {
        state.username = '';
        state.name = '';
        state.email = '';
        state.uuid = '';
        state.isAuthenticated = false;
        state.token = null;
        state.error = null;
        state.profile = null;
      })
      .addCase(logoutUserAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        // Все равно очищаем состояние
        state.username = '';
        state.name = '';
        state.email = '';
        state.uuid = '';
        state.isAuthenticated = false;
        state.token = null;
        state.profile = null;
      });
  },
});

export const { checkAuth, clearError } = userSlice.actions;
export default userSlice.reducer;


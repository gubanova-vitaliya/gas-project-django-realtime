/**
 * ПРИМЕР: Использование сгенерированного API из Swagger
 * 
 * Этот файл демонстрирует, как можно использовать сгенерированный TypeScript клиент
 * вместо прямых вызовов Axios. Файл является примером и не используется в проекте.
 * 
 * Для генерации API выполните: npm run generate-api
 * Сгенерированный код будет находиться в src/api/Api.ts
 */

/**
 * ПРИМЕР 1: Использование сгенерированного API в createAsyncThunk
 */

/*
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Api } from '../api/Api'; // Сгенерированный API клиент

// Создание экземпляра API клиента
const apiClient = new Api({
  baseURL: getDestApi(),
  // Axios конфигурация (сгенерированный клиент использует axios внутри)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Настройка interceptor для добавления токена авторизации
apiClient.instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Пример асинхронного действия с использованием сгенерированного API
export const loginUserAsync = createAsyncThunk(
  'user/loginUserAsync',
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      // Использование сгенерированного метода вместо axios.post()
      // Типы параметров и ответа генерируются автоматически из Swagger
      const response = await apiClient.auth.login({
        login: credentials.login,
        password: credentials.password,
      });
      
      // response.data уже типизирован согласно Swagger схеме
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      
      return {
        username: response.data.user?.login || credentials.login,
        token: response.data.access_token,
      };
    } catch (error: any) {
      return rejectWithValue('Ошибка авторизации');
    }
  }
);

// Пример получения профиля пользователя
export const getUserProfileAsync = createAsyncThunk(
  'user/getUserProfileAsync',
  async (_, { rejectWithValue }) => {
    try {
      // Использование сгенерированного метода
      // Типы генерируются из Swagger, поэтому IDE подскажет доступные поля
      const response = await apiClient.users.getMe();
      
      // response.data типизирован как UserProfile согласно Swagger
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при загрузке профиля');
    }
  }
);

// Пример получения списка газов
export const getGasesList = createAsyncThunk(
  'gas/getGasesList',
  async (filters: { search?: string }, { rejectWithValue }) => {
    try {
      // Сгенерированный метод с параметрами запроса
      const response = await apiClient.gases.getGases({
        search: filters.search,
      });
      
      // response.data автоматически типизирован как Gas[]
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при загрузке газов');
    }
  }
);

// Пример создания расчета
export const createCalculation = createAsyncThunk(
  'calculation/create',
  async (data: { text?: string; title?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.calculations.createCalculation({
        text: data.text,
        title: data.title,
      });
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при создании расчета');
    }
  }
);

// Пример обновления параметров газа в расчете
export const updateGasCalculation = createAsyncThunk(
  'calculation/updateGas',
  async (
    { 
      gasCalculationId, 
      data 
    }: { 
      gasCalculationId: number; 
      data: {
        initial_pressure?: number;
        initial_volume?: number;
        initial_temperature?: number;
        final_temperature?: number;
        volume?: number;
        gas_amount?: number;
        final_pressure?: number;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      // PUT запрос через сгенерированный API
      const response = await apiClient.calculations.updateGasCalculation({
        id: gasCalculationId,
        requestBody: data, // Тело запроса типизировано согласно Swagger
      });
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при обновлении газа');
    }
  }
);
*/

/**
 * ПРЕИМУЩЕСТВА использования сгенерированного API:
 * 
 * 1. ТИПОБЕЗОПАСНОСТЬ:
 *    - Все методы, параметры и ответы типизированы автоматически
 *    - IDE будет подсказывать доступные поля и методы
 *    - Ошибки типов будут обнаружены на этапе компиляции
 * 
 * 2. АВТОДОПОЛНЕНИЕ:
 *    - При вводе apiClient. IDE покажет все доступные модули (auth, users, gases, calculations)
 *    - При вводе метода IDE покажет необходимые параметры
 * 
 * 3. СИНХРОНИЗАЦИЯ С BACKEND:
 *    - При изменении Swagger спецификации просто перегенерируйте API
 *    - Изменения в API автоматически отражаются в типах
 * 
 * 4. МЕНЬШЕ ОШИБОК:
 *    - Нет риска опечаток в URL эндпоинтов
 *    - Нет риска неправильных типов данных
 * 
 * 5. ЕДИНООБРАЗИЕ:
 *    - Все API вызовы используют одинаковый стиль
 *    - Легко понять структуру API по структуре сгенерированного кода
 */

/**
 * СРАВНЕНИЕ подходов:
 * 
 * ТЕКУЩИЙ ПОДХОД (прямой Axios):
 * ```typescript
 * const response = await axios.post(`${apiBase}/api/auth/login`, {
 *   login: credentials.login,
 *   password: credentials.password,
 * });
 * ```
 * - Требует ручного написания URL
 * - Нет проверки типов параметров и ответа
 * - Нужно помнить точные названия эндпоинтов
 * 
 * СГЕНЕРИРОВАННЫЙ API:
 * ```typescript
 * const response = await apiClient.auth.login({
 *   login: credentials.login,
 *   password: credentials.password,
 * });
 * ```
 * - URL генерируется автоматически
 * - Параметры и ответ полностью типизированы
 * - IDE подсказывает доступные методы
 */

/**
 * МИГРАЦИЯ на сгенерированный API:
 * 
 * 1. Сгенерируйте API: npm run generate-api
 * 2. Создайте экземпляр API клиента в отдельном файле
 * 3. Настройте interceptors для добавления токена авторизации
 * 4. Замените прямые вызовы axios на методы сгенерированного API
 * 5. Обновите типы в createAsyncThunk на типы из сгенерированного API
 */

export {}; // Для корректной работы TypeScript



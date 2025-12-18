import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getDestApi } from '../../target_config';
import { Gas } from '../components/GasCard';

// Интерфейсы для заявки
interface GasInCalculation {
  id?: number; // ID из таблицы GasCalculation (gasCalculationId)
  gas?: Gas;
  quantity?: number;
  sound?: boolean;
  position?: number;
  order_number?: number; // Порядковый номер добавления
  // Поля для расчета финального давления
  initial_pressure?: number | null; // P1 - начальное давление (Па)
  initial_volume?: number | null; // V1 - начальный объем (м³)
  initial_temperature?: number | null; // T1 - начальная температура (К)
  final_volume?: number | null; // V2 - конечный объем (м³)
  final_temperature?: number | null; // T2 - конечная температура (К)
  final_pressure?: number | null; // P2 - финальное давление (рассчитанное)
  calculated?: boolean; // Флаг, что расчет выполнен
}

interface CalculationData {
  text?: string | null;
  title?: string | null;
}

interface CalculationListItem {
  id: number;
  status: string;
  text: string;
  title?: string;
  date_create: string;
  creator_id: number;
  order_number?: number;
  gases?: Array<{
    id?: number;
    gas_id?: number;
    gas?: Gas;
    position?: number;
    initial_pressure?: number | null;
    initial_temperature?: number | null;
    final_temperature?: number | null;
    volume?: number | null;
    gas_amount?: number | null;
    final_pressure?: number | null;
  }>;
}

interface CalculationState {
  app_id: number | null;
  count: number;
  gases: GasInCalculation[];
  calculationData: CalculationData;
  error: string | null;
  isDraft: boolean;
  loading: boolean;
  myCalculations: CalculationListItem[];
  myCalculationsLoading: boolean;
}

const initialState: CalculationState = {
  app_id: null,
  count: 0,
  gases: [],
  calculationData: {
    text: '',
    title: '',
  },
  error: null,
  isDraft: false,
  loading: false,
  myCalculations: [],
  myCalculationsLoading: false,
};

// Получение данных заявки
export const getCalculation = createAsyncThunk(
  'calculation/getCalculation',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      // Проверяем валидность ID
      if (!appId || appId === 'null' || appId === 'undefined' || appId === '0') {
        return rejectWithValue('Неверный ID заявки');
      }
      
      const response = await axios.get(`${apiBase}/api/calculations/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      // Более детальная обработка ошибок
      if (error.response?.status === 404) {
        console.warn(`Calculation with ID ${appId} not found (404)`);
        return rejectWithValue('Заявка не найдена');
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        return rejectWithValue('Нет доступа к этой заявке');
      }
      return rejectWithValue('Ошибка при загрузке данных');
    }
  }
);

// Добавление газа в заявку (черновик)
export const addGasToCalculation = createAsyncThunk(
  'calculation/addGasToCalculation',
  async (gasId: number, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.post(
        `${apiBase}/api/gases/${gasId}/add-to-draft`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при добавлении газа');
    }
  }
);

// Удаление заявки
export const deleteCalculation = createAsyncThunk(
  'calculation/deleteCalculation',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.delete(`${apiBase}/api/calculations/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      return rejectWithValue('Ошибка при удалении заявки');
    }
  }
);

// Обновление полей заявки
export const updateCalculation = createAsyncThunk(
  'calculation/updateCalculation',
  async ({ appId, calculationData }: { appId: string; calculationData: CalculationData }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.put(
        `${apiBase}/api/calculations/${appId}`,
        { text: calculationData.text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Ошибка при обновлении данных');
    }
  }
);

// Удаление газа из заявки
export const deleteGasFromCalculation = createAsyncThunk(
  'calculation/deleteGasFromCalculation',
  async (gasCalculationId: number, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      // Используем gasCalculationId (ID из таблицы GasCalculation), а не gasId
      await axios.delete(`${apiBase}/api/mm/gas/${gasCalculationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return gasCalculationId;
    } catch (error: any) {
      return rejectWithValue('Ошибка при удалении газа из заявки');
    }
  }
);

// Получение черновика заявки (для журнала расчетов)
export const getDraftCalculationAsync = createAsyncThunk(
  'calculation/getDraftCalculation',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return rejectWithValue('Требуется авторизация');
      }
      
      const response = await axios.get(`${apiBase}/api/my-draft`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Черновик не найден - это нормально, вернем пустые данные
        return null;
      }
      return rejectWithValue('Ошибка при загрузке черновика');
    }
  }
);

// Получение списка заявок пользователя
export const getMyCalculationsAsync = createAsyncThunk(
  'calculation/getMyCalculations',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Если нет токена, возвращаем пустой массив
        return [];
      }
      
      const response = await axios.get(`${apiBase}/api/my-calculations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Убеждаемся, что возвращаем массив
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      // Если ошибка 401 или 403, возвращаем пустой массив вместо ошибки
      if (error.response?.status === 401 || error.response?.status === 403) {
        return [];
      }
      return rejectWithValue('Ошибка при загрузке списка заявок');
    }
  }
);

// Подтверждение заявки (старый метод, оставляем для совместимости)
export const submitCalculationAsync = createAsyncThunk(
  'calculation/submitCalculation',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.post(`${apiBase}/api/calculations/${appId}/submit`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      return rejectWithValue('Ошибка при подтверждении заявки');
    }
  }
);

// Удаление заявки (статус меняется на "Удалена")
export const markCalculationAsDeleted = createAsyncThunk(
  'calculation/markAsDeleted',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.post(`${apiBase}/api/calculations/${appId}/delete`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      // Если такого эндпоинта нет, пробуем через PUT с изменением статуса
      try {
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');
        
        await axios.put(
          `${apiBase}/api/calculations/${appId}`,
          { status: 'deleted' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        return appId;
      } catch (innerError: any) {
        return rejectWithValue('Ошибка при удалении заявки');
      }
    }
  }
);

// Формирование заявки (статус меняется на "Сформирована")
export const markCalculationAsFormed = createAsyncThunk(
  'calculation/markAsFormed',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.post(`${apiBase}/api/calculations/${appId}/form`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      // Если такого эндпоинта нет, пробуем через PUT с изменением статуса
      try {
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');
        
        await axios.put(
          `${apiBase}/api/calculations/${appId}`,
          { status: 'formed' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        return appId;
      } catch (innerError: any) {
        return rejectWithValue('Ошибка при формировании заявки');
      }
    }
  }
);

// Обновление количества/параметров газа в заявке
export const updateGasInCalculationAsync = createAsyncThunk(
  'calculation/updateGasInCalculation',
  async ({ gasId, data }: { gasId: number; data: { quantity?: number; sound?: boolean; position?: number } }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.put(`${apiBase}/api/mm/gas/${gasId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return { gasId, data };
    } catch (error: any) {
      return rejectWithValue('Ошибка при обновлении газа в заявке');
    }
  }
);

/**
 * ASYNC THUNK: Расчет финального давления и сохранение на сервере
 * 
 * Демонстрирует:
 * - Сложную бизнес-логику (расчет формулы) перед HTTP-запросом
 * - PUT-запрос через axios.put() для обновления данных
 * - Передачу множества параметров в теле запроса
 * - Использование JWT токена для авторизации
 * 
 * В компонентах вызывается так:
 * dispatch(calculateFinalPressure({ appId, gasId, initial_pressure, ... }))
 */
export const calculateFinalPressure = createAsyncThunk(
  'calculation/calculateFinalPressure',
  async (
    {
      appId,
      gasId,
      initial_pressure,
      initial_volume,
      initial_temperature,
      final_volume,
      final_temperature,
    }: {
      appId: number;
      gasId: number;
      initial_pressure: number;
      initial_volume: number;
      initial_temperature: number;
      final_volume: number;
      final_temperature: number;
    },
    { rejectWithValue }
  ) => {
    try {
      // БИЗНЕС-ЛОГИКА: Расчет финального давления по формуле идеального газа
      // Формула: P2 = P1 * V1 * T2 / (V2 * T1)
      // Все температуры в Кельвинах
      const final_pressure =
        (initial_pressure * initial_volume * final_temperature) /
        (final_volume * initial_temperature);

      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');

      // Отправляем результаты на сервер
      // Используем gasCalculationId (ID из таблицы GasCalculation)
      const gasCalculationId = gasId; // gasId здесь уже должен быть gasCalculationId
      
      // ИСПОЛЬЗОВАНИЕ AXIOS: PUT-запрос для обновления данных на сервере
      // axios.put(url, data, config) - обновляет ресурс по указанному ID
      try {
        await axios.put(
          `${apiBase}/api/mm/gas/${gasCalculationId}`, // URL с ID ресурса
          {
            // Тело запроса: все параметры и результат расчета
            initial_pressure: Math.round(initial_pressure * 10000) / 10000,
            initial_volume: Math.round(initial_volume * 10000) / 10000,
            initial_temperature: Math.round(initial_temperature * 10000) / 10000,
            final_temperature: Math.round(final_temperature * 10000) / 10000,
            volume: Math.round(final_volume * 10000) / 10000,
            gas_amount: Math.round(final_volume * 10000) / 10000,
            final_pressure: Math.round(final_pressure * 10000) / 10000,
          },
          {
            // Конфигурация запроса: заголовки для авторизации
            headers: {
              Authorization: `Bearer ${token}`, // JWT токен для аутентификации
              'Content-Type': 'application/json', // Указываем тип контента
            },
          }
        );
      } catch (saveError: any) {
        // Логируем ошибку, но не прерываем выполнение - расчет уже выполнен локально
        console.error('Ошибка при сохранении результатов расчета:', saveError);
        // Продолжаем выполнение - расчет все равно будет выполнен локально
      }

      return {
        gasId,
        final_pressure,
      };
    } catch (error: any) {
      // Если API не доступен, просто рассчитываем локально
      // Формула идеального газа: P2 = P1 * V1 * T2 / (V2 * T1)
      const final_pressure =
        (initial_pressure * initial_volume * final_temperature) /
        (final_volume * initial_temperature);
      
      // Возвращаем успешный результат даже при ошибке API, так как расчет выполнен
      return {
        gasId,
        final_pressure,
        calculated: true,
      };
    }
  }
);

const calculationSlice = createSlice({
  name: 'calculation',
  initialState,
  reducers: {
    setAppId(state, action: PayloadAction<number | null>) {
      state.app_id = action.payload;
    },
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
    clearMyCalculations(state) {
      state.myCalculations = [];
      state.myCalculationsLoading = false;
    },
    setCalculationData(state, action: PayloadAction<CalculationData>) {
      state.calculationData = {
        ...state.calculationData,
        ...action.payload,
      };
    },
    setGases(state, action: PayloadAction<GasInCalculation[]>) {
      state.gases = action.payload;
    },
    // Обновление полей расчета для конкретного газа
    updateGasCalculationFields(
      state,
      action: PayloadAction<{
        gasId: number;
        fields: Partial<Pick<GasInCalculation, 'initial_pressure' | 'initial_volume' | 'initial_temperature' | 'final_volume' | 'final_temperature'>>;
      }>
    ) {
      const gasIndex = state.gases.findIndex((g) => g.gas?.id === action.payload.gasId);
      if (gasIndex !== -1) {
        state.gases[gasIndex] = {
          ...state.gases[gasIndex],
          ...action.payload.fields,
        };
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearCalculation(state) {
      state.app_id = null;
      state.count = 0;
      state.gases = [];
      state.calculationData = { text: '', title: '' };
      state.error = null;
      state.isDraft = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // getCalculation
      .addCase(getCalculation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCalculation.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // API возвращает данные в формате { calculation: {...}, gases: [...] }
        // или напрямую в action.payload с полями id, status, text, gases
        if (action.payload) {
          // Проверяем, вложены ли данные в объект calculation
          const calcData = action.payload.calculation || action.payload;
          const gasesData = action.payload.gases || calcData.gases || [];
          
          state.app_id = calcData.id || calcData.app_id || action.payload.id;
          state.calculationData = {
            text: calcData.text || action.payload.text || '',
            title: calcData.title || action.payload.title || calcData.text || '',
          };
          state.isDraft = (calcData.status === 'draft' || calcData.status === 1 || action.payload.status === 'draft' || action.payload.status === 1);
          
          // Обрабатываем газы
          const gases = gasesData.map((gas: any, index: number) => {
            // Если газ приходит с полем gas (вложенный объект), используем его
            const gasObj = gas.gas || gas;
            return {
              ...gas,
              id: gas.id, // ID из GasCalculation
              gas: gasObj,
              order_number: gas.position || index + 1,
              initial_pressure: gas.initial_pressure ?? null,
              initial_volume: gas.volume ?? gas.initial_volume ?? null,
              initial_temperature: gas.initial_temperature ?? null,
              final_volume: gas.final_volume ?? null,
              final_temperature: gas.final_temperature ?? null,
              final_pressure: gas.final_pressure ?? null,
              calculated: gas.final_pressure !== null && gas.final_pressure !== undefined,
              quantity: gas.quantity ?? 1,
            };
          });
          state.gases = gases;
          state.count = gases.length;
        }
      })
      .addCase(getCalculation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addGasToCalculation
      .addCase(addGasToCalculation.pending, (state) => {
        state.loading = true;
      })
      .addCase(addGasToCalculation.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // После добавления газа обновляем данные корзины из ответа API
        if (action.payload) {
          // Если API вернул данные корзины (draft_id, count), обновляем их
          if (action.payload.draft_id !== undefined && action.payload.draft_id !== null) {
            state.app_id = action.payload.draft_id;
          }
          if (action.payload.count !== undefined && action.payload.count !== null) {
            state.count = action.payload.count;
          }
          // Если API вернул список газов, обновляем его
          if (action.payload.gases && Array.isArray(action.payload.gases)) {
            state.gases = action.payload.gases.map((gas: any, index: number) => ({
              ...gas,
              order_number: gas.order_number || index + 1,
            }));
          }
        }
      })
      .addCase(addGasToCalculation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // calculateFinalPressure
      .addCase(calculateFinalPressure.fulfilled, (state, action) => {
        // gasId здесь - это gasCalculationId (ID из таблицы GasCalculation)
        const gasIndex = state.gases.findIndex(
          (g) => g.id === action.payload.gasId
        );
        if (gasIndex !== -1) {
          state.gases[gasIndex] = {
            ...state.gases[gasIndex],
            final_pressure: action.payload.final_pressure,
            calculated: true,
          };
        }
      })
      .addCase(calculateFinalPressure.rejected, (state, action) => {
        // В случае ошибки API, расчет уже выполнен локально
        // но не сохранился в БД
        state.error = 'Не удалось сохранить расчет в базу данных, но результат рассчитан локально';
      })
      // deleteCalculation
      .addCase(deleteCalculation.fulfilled, (state) => {
        state.app_id = null;
        state.count = 0;
        state.gases = [];
        state.calculationData = { text: '', title: '' };
        state.error = null;
        state.isDraft = false;
      })
      .addCase(deleteCalculation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateCalculation
      .addCase(updateCalculation.fulfilled, (state, action) => {
        if (action.payload) {
          state.calculationData = {
            text: action.payload.text || state.calculationData.text,
            title: action.payload.title || state.calculationData.title,
          };
        }
      })
      .addCase(updateCalculation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // deleteGasFromCalculation
      .addCase(deleteGasFromCalculation.fulfilled, (state, action) => {
        state.gases = state.gases.filter((g) => g.gas?.id !== action.payload);
        state.count = state.gases.length;
      })
      .addCase(deleteGasFromCalculation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // getDraftCalculationAsync
      .addCase(getDraftCalculationAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDraftCalculationAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload) {
          // API возвращает данные в формате CalculationDetailDTO
          state.app_id = action.payload.id;
          state.calculationData = {
            text: action.payload.text || '',
            title: action.payload.text || '',
          };
          state.isDraft = action.payload.status === 'draft';
          
          // Обрабатываем газы
          const gases = (action.payload.gases || []).map((gas: any, index: number) => {
            const gasObj = gas.gas || gas;
            return {
              ...gas,
              id: gas.id, // ID из GasCalculation
              gas: gasObj,
              order_number: gas.position || index + 1,
              initial_pressure: gas.initial_pressure ?? null,
              initial_volume: gas.volume ?? gas.initial_volume ?? null,
              initial_temperature: gas.initial_temperature ?? null,
              final_volume: gas.final_volume ?? null,
              final_temperature: gas.final_temperature ?? null,
              final_pressure: gas.final_pressure ?? null,
              calculated: gas.final_pressure !== null && gas.final_pressure !== undefined,
              quantity: gas.quantity ?? 1,
            };
          });
          state.gases = gases;
          state.count = gases.length;
        } else {
          // Черновик не найден - очищаем данные, но не app_id (он может быть установлен из другого источника)
          state.gases = [];
          state.count = 0;
          // Не очищаем app_id, так как он может быть установлен из другого источника
        }
      })
      .addCase(getDraftCalculationAsync.rejected, (state, action) => {
        state.loading = false;
        // Не устанавливаем ошибку, если это просто отсутствие черновика
        if (action.payload !== 'Ошибка при загрузке черновика') {
          state.error = action.payload as string;
        }
      })
      // getMyCalculationsAsync
      .addCase(getMyCalculationsAsync.pending, (state) => {
        state.myCalculationsLoading = true;
        state.error = null;
      })
      .addCase(getMyCalculationsAsync.fulfilled, (state, action) => {
        state.myCalculationsLoading = false;
        // Убеждаемся, что это массив (может прийти null или undefined)
        state.myCalculations = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getMyCalculationsAsync.rejected, (state, action) => {
        state.myCalculationsLoading = false;
        state.error = action.payload as string;
      })
      // submitCalculationAsync
      .addCase(submitCalculationAsync.fulfilled, (state) => {
        state.isDraft = false;
        // Можно обновить статус в списке заявок
      })
      .addCase(submitCalculationAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateGasInCalculationAsync
      .addCase(updateGasInCalculationAsync.fulfilled, (state, action) => {
        const { gasId, data } = action.payload;
        const gas = state.gases.find((g) => g.gas?.id === gasId);
        if (gas) {
          if (data.quantity !== undefined) gas.quantity = data.quantity;
          if (data.sound !== undefined) gas.sound = data.sound;
          if (data.position !== undefined) gas.position = data.position;
        }
      })
      .addCase(updateGasInCalculationAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setAppId,
  setCount,
  setCalculationData,
  setGases,
  setError,
  clearCalculation,
  updateGasCalculationFields,
  clearMyCalculations,
} = calculationSlice.actions;

export default calculationSlice.reducer;


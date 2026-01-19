import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getDestApi } from '../../target_config';
import { Gas } from '../components/GasCard';

// Интерфейсы для заявки
interface GasInVesselPressure {
  id?: number; // ID из таблицы GasVesselPressure (gasVesselPressureId)
  gas?: Gas;
  quantity?: number;
  sound?: boolean;
  position?: number;
  order_number?: number; // Порядковый номер добавления
  // Поля для расчета финального давления
  initial_pressure?: number | null; // P1 - начальное давление (Па)
  initial_volume?: number | null; // V1 - начальный объем (м³)
  volume?: number | null; // Объем (м³)
  initial_temperature?: number | null; // T1 - начальная температура (К)
  final_volume?: number | null; // V2 - конечный объем (м³)
  final_temperature?: number | null; // T2 - конечная температура (К)
  final_pressure?: number | null; // P2 - финальное давление (рассчитанное)
  gas_amount?: number | null; // Количество вещества (моль)
  calculated?: boolean; // Флаг, что расчет выполнен
}

interface VesselPressureData {
  text?: string | null;
  title?: string | null;
  date_create?: string | null;
}

interface VesselPressureListItem {
  id: number;
  status: string;
  text: string;
  title?: string;
  date_create: string;
  creator_id: number;
  order_number?: number;
  calculated_count?: number; // Количество газов с рассчитанным давлением
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

// Интерфейс для черновика
interface DraftVesselPressure {
  id: number;
  status: string;
  text?: string;
  date_create?: string;
  gases: GasInVesselPressure[];
}

interface VesselPressureState {
  app_id: number | null;
  count: number;
  gases: GasInVesselPressure[];
  vesselPressureData: VesselPressureData;
  error: string | null;
  isDraft: boolean;
  loading: boolean;
  myVesselPressures: VesselPressureListItem[];
  myVesselPressuresLoading: boolean;
  vesselPressureNumber: number | null;
  status: string | null;
  // Все черновики пользователя
  allDrafts: DraftVesselPressure[];
  allDraftsLoading: boolean;
}

const initialState: VesselPressureState = {
  app_id: null,
  count: 0,
  gases: [],
  vesselPressureData: {
    text: '',
    title: '',
    date_create: null,
  },
  error: null,
  isDraft: false,
  loading: false,
  myVesselPressures: [],
  myVesselPressuresLoading: false,
  vesselPressureNumber: null,
  status: null,
  allDrafts: [],
  allDraftsLoading: false,
};

// Получение данных заявки
export const getVesselPressure = createAsyncThunk(
  'vesselPressure/getVesselPressure',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      // Проверяем валидность ID
      if (!appId || appId === 'null' || appId === 'undefined' || appId === '0') {
        return rejectWithValue('Неверный ID заявки');
      }
      
      const response = await axios.get(`${apiBase}/api/vessel-pressures/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      // Более детальная обработка ошибок
      if (error.response?.status === 404) {
        console.warn(`VesselPressure with ID ${appId} not found (404)`);
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
export const addGasToVesselPressure = createAsyncThunk(
  'vesselPressure/addGasToVesselPressure',
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
export const deleteVesselPressure = createAsyncThunk(
  'vesselPressure/deleteVesselPressure',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.delete(`${apiBase}/api/vessel-pressures/${appId}`, {
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
export const updateVesselPressure = createAsyncThunk(
  'vesselPressure/updateVesselPressure',
  async ({ appId, vesselPressureData }: { appId: string; vesselPressureData: VesselPressureData }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.put(
        `${apiBase}/api/vessel-pressures/${appId}`,
        { text: vesselPressureData.text },
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
export const deleteGasFromVesselPressure = createAsyncThunk(
  'vesselPressure/deleteGasFromVesselPressure',
  async (gasCalculationId: number, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
  
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

// Получение черновика заявки (для журнала давления сосуда)
export const getDraftVesselPressureAsync = createAsyncThunk(
  'vesselPressure/getDraftVesselPressure',
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
        return null;
      }
      return rejectWithValue('Ошибка при загрузке черновика');
    }
  }
);

// Получение ВСЕХ черновиков заявок пользователя (для журнала давления сосуда)
export const getAllDraftsAsync = createAsyncThunk(
  'vesselPressure/getAllDrafts',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return rejectWithValue('Требуется авторизация');
      }
      
      const response = await axios.get(`${apiBase}/api/my-drafts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      return rejectWithValue('Ошибка при загрузке черновиков');
    }
  }
);

// Получение списка заявок пользователя
export const getMyVesselPressuresAsync = createAsyncThunk(
  'vesselPressure/getMyVesselPressures',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return [];
      }
      
      const response = await axios.get(`${apiBase}/api/my-vessel-pressures`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return [];
      }
      return rejectWithValue('Ошибка при загрузке списка заявок');
    }
  }
);

// Подтверждение заявки (старый метод, оставляем для совместимости)
export const submitVesselPressureAsync = createAsyncThunk(
  'vesselPressure/submitVesselPressure',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.post(`${apiBase}/api/vessel-pressures/${appId}/submit`, {}, {
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
export const markVesselPressureAsDeleted = createAsyncThunk(
  'vesselPressure/markAsDeleted',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      // Используем DELETE метод вместо POST
      await axios.delete(`${apiBase}/api/vessel-pressures/${appId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.description || 'Ошибка при удалении заявки');
    }
  }
);

// Обновление названия заявки (text)
export const updateVesselPressureText = createAsyncThunk(
  'vesselPressure/updateText',
  async ({ appId, text }: { appId: string; text: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.put(
        `${apiBase}/api/vessel-pressures/${appId}`,
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      return { appId, text };
    } catch (error: any) {
      return rejectWithValue('Ошибка при обновлении названия заявки');
    }
  }
);

// Формирование заявки (статус меняется на "Сформирована")
export const markVesselPressureAsFormed = createAsyncThunk(
  'vesselPressure/markAsFormed',
  async (appId: string, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      await axios.post(`${apiBase}/api/vessel-pressures/${appId}/submit`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return appId;
    } catch (error: any) {
      try {
        const apiBase = getDestApi();
        const token = localStorage.getItem('auth_token');
        
        await axios.put(
          `${apiBase}/api/vessel-pressures/${appId}`,
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
export const updateGasInVesselPressureAsync = createAsyncThunk(
  'vesselPressure/updateGasInVesselPressure',
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
  'vesselPressure/calculateFinalPressure',
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
      // Используем gasVesselPressureId (ID из таблицы GasVesselPressure)
      const gasVesselPressureId = gasId; // gasId здесь уже должен быть gasVesselPressureId
      
      // ИСПОЛЬЗОВАНИЕ AXIOS: PUT-запрос для обновления данных на сервере
      // axios.put(url, data, config) - обновляет ресурс по указанному ID
      try {
        await axios.put(
          `${apiBase}/api/mm/gas/${gasVesselPressureId}`, // URL с ID ресурса
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
        console.error('Ошибка при сохранении результатов давления сосуда:', saveError);
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
      
      // Возвращаем успешный результат даже при ошибке API, так как расчет давления сосуда выполнен
      return {
        gasId,
        final_pressure,
        calculated: true,
      };
    }
  }
);

const vesselPressureSlice = createSlice({
  name: 'vesselPressure',
  initialState,
  reducers: {
    setAppId(state, action: PayloadAction<number | null>) {
      state.app_id = action.payload;
    },
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
    clearMyVesselPressures(state) {
      state.myVesselPressures = [];
      state.myVesselPressuresLoading = false;
    },
    setVesselPressureData(state, action: PayloadAction<VesselPressureData>) {
      state.vesselPressureData = {
        ...state.vesselPressureData,
        ...action.payload,
      };
    },
    setGases(state, action: PayloadAction<GasInVesselPressure[]>) {
      state.gases = action.payload;
    },
    // Обновление полей давления сосуда для конкретного газа
    updateGasVesselPressureFields(
      state,
      action: PayloadAction<{
        gasId: number;
        fields: Partial<Pick<GasInVesselPressure, 'initial_pressure' | 'initial_volume' | 'initial_temperature' | 'final_volume' | 'final_temperature'>>;
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
    clearVesselPressure(state) {
      state.app_id = null;
      state.count = 0;
      state.gases = [];
      state.vesselPressureData = { text: '', title: '', date_create: null };
      state.error = null;
      state.isDraft = false;
      state.vesselPressureNumber = null;
      state.status = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getVesselPressure
      .addCase(getVesselPressure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVesselPressure.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // API возвращает данные в формате { vesselPressure: {...}, gases: [...] }
        // или напрямую в action.payload с полями id, status, text, gases
        if (action.payload) {
          // Проверяем, вложены ли данные в объект vesselPressure
          const calcData = action.payload.vesselPressure || action.payload;
          const gasesData = action.payload.gases || calcData.gases || [];
          
          state.app_id = calcData.id || calcData.app_id || action.payload.id;
          state.vesselPressureData = {
            text: calcData.text || action.payload.text || '',
            title: calcData.title || action.payload.title || calcData.text || '',
            date_create: calcData.date_create || action.payload.date_create || null,
          };
          state.vesselPressureNumber = calcData.vessel_pressure_number || action.payload.vessel_pressure_number || null;
          state.status = calcData.status || action.payload.status || null;
          state.isDraft = (calcData.status === 'draft' || calcData.status === 1 || action.payload.status === 'draft' || action.payload.status === 1);
          
          // Обрабатываем газы
          const gases = gasesData.map((gas: any, index: number) => {
            // Если газ приходит с полем gas (вложенный объект), используем его
            const gasObj = gas.gas || gas;
            return {
              ...gas,
              id: gas.id, // ID из GasVesselPressure
              gas: gasObj,
              order_number: gas.position || index + 1,
              initial_pressure: gas.initial_pressure !== null && gas.initial_pressure !== undefined ? gas.initial_pressure : null,
              initial_volume: gas.initial_volume !== null && gas.initial_volume !== undefined ? gas.initial_volume : null,
              volume: gas.volume !== null && gas.volume !== undefined ? gas.volume : (gas.initial_volume !== null && gas.initial_volume !== undefined ? gas.initial_volume : null),
              initial_temperature: gas.initial_temperature !== null && gas.initial_temperature !== undefined ? gas.initial_temperature : null,
              final_volume: gas.final_volume !== null && gas.final_volume !== undefined ? gas.final_volume : null,
              final_temperature: gas.final_temperature !== null && gas.final_temperature !== undefined ? gas.final_temperature : null,
              gas_amount: gas.gas_amount !== null && gas.gas_amount !== undefined ? gas.gas_amount : null,
              final_pressure: gas.final_pressure !== null && gas.final_pressure !== undefined ? gas.final_pressure : null,
              calculated: gas.final_pressure !== null && gas.final_pressure !== undefined,
              quantity: gas.quantity ?? 1,
            };
          });
          state.gases = gases;
          state.count = gases.length;
        }
      })
      .addCase(getVesselPressure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addGasToVesselPressure
      .addCase(addGasToVesselPressure.pending, (state) => {
        state.loading = true;
      })
      .addCase(addGasToVesselPressure.fulfilled, (state, action) => {
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
      .addCase(addGasToVesselPressure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateVesselPressureText
      .addCase(updateVesselPressureText.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateVesselPressureText.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Обновляем text в соответствующем черновике
        if (action.payload) {
          const draftIndex = state.allDrafts.findIndex(d => d.id === parseInt(action.payload.appId));
          if (draftIndex !== -1) {
            state.allDrafts[draftIndex].text = action.payload.text;
          }
          // Также обновляем в vesselPressureData, если это текущая заявка
          if (state.app_id === parseInt(action.payload.appId)) {
            state.vesselPressureData.text = action.payload.text;
          }
        }
      })
      .addCase(updateVesselPressureText.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // calculateFinalPressure
      .addCase(calculateFinalPressure.fulfilled, (state, action) => {
        // gasId здесь - это gasVesselPressureId (ID из таблицы GasVesselPressure)
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
        state.error = 'Не удалось сохранить давление сосуда в базу данных, но результат рассчитан локально';
      })
      // deleteVesselPressure
      .addCase(deleteVesselPressure.fulfilled, (state) => {
        state.app_id = null;
        state.count = 0;
        state.gases = [];
        state.vesselPressureData = { text: '', title: '' };
        state.error = null;
        state.isDraft = false;
      })
      .addCase(deleteVesselPressure.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateVesselPressure
      .addCase(updateVesselPressure.fulfilled, (state, action) => {
        if (action.payload) {
          state.vesselPressureData = {
            text: action.payload.text || state.vesselPressureData.text,
            title: action.payload.title || state.vesselPressureData.title,
          };
        }
      })
      .addCase(updateVesselPressure.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // deleteGasFromVesselPressure
      .addCase(deleteGasFromVesselPressure.fulfilled, (state, action) => {
        state.gases = state.gases.filter((g) => g.gas?.id !== action.payload);
        state.count = state.gases.length;
      })
      .addCase(deleteGasFromVesselPressure.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // getDraftVesselPressureAsync
      .addCase(getDraftVesselPressureAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDraftVesselPressureAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload) {
          // API возвращает данные в формате VesselPressureDetailDTO
          state.app_id = action.payload.id;
          state.vesselPressureData = {
            text: action.payload.text || '',
            title: action.payload.text || '',
          };
          state.isDraft = action.payload.status === 'draft';
          
          // Обрабатываем газы
          const gases = (action.payload.gases || []).map((gas: any, index: number) => {
            const gasObj = gas.gas || gas;
            return {
              ...gas,
              id: gas.id, // ID из GasVesselPressure
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
      .addCase(getDraftVesselPressureAsync.rejected, (state, action) => {
        state.loading = false;
        // Не устанавливаем ошибку, если это просто отсутствие черновика
        if (action.payload !== 'Ошибка при загрузке черновика') {
          state.error = action.payload as string;
        }
      })
      // getAllDraftsAsync - получение ВСЕХ черновиков
      .addCase(getAllDraftsAsync.pending, (state) => {
        state.allDraftsLoading = true;
        state.error = null;
      })
      .addCase(getAllDraftsAsync.fulfilled, (state, action) => {
        state.allDraftsLoading = false;
        state.error = null;
        // Преобразуем данные в формат DraftVesselPressure
        const drafts = (action.payload || []).map((draft: any) => {
          const gases = (draft.gases || []).map((gas: any, index: number) => {
            const gasObj = gas.gas || gas;
            return {
              ...gas,
              id: gas.id,
              gas: gasObj,
              order_number: gas.position || index + 1,
              initial_pressure: gas.initial_pressure ?? null,
              initial_volume: gas.volume ?? gas.initial_volume ?? null,
              initial_temperature: gas.initial_temperature ?? null,
              final_volume: gas.final_volume ?? null,
              final_temperature: gas.final_temperature ?? null,
              volume: gas.volume ?? null,
              gas_amount: gas.gas_amount ?? null,
              final_pressure: gas.final_pressure ?? null,
              calculated: gas.final_pressure !== null && gas.final_pressure !== undefined,
              quantity: gas.quantity ?? 1,
            };
          });
          return {
            id: draft.id,
            status: draft.status,
            text: draft.text || '',
            date_create: draft.date_create,
            gases: gases,
          };
        });
        state.allDrafts = drafts;
      })
      .addCase(getAllDraftsAsync.rejected, (state, action) => {
        state.allDraftsLoading = false;
        state.allDrafts = [];
        // Не устанавливаем ошибку, если это просто отсутствие черновиков
      })
      // getMyVesselPressuresAsync
      .addCase(getMyVesselPressuresAsync.pending, (state) => {
        state.myVesselPressuresLoading = true;
        state.error = null;
      })
      .addCase(getMyVesselPressuresAsync.fulfilled, (state, action) => {
        state.myVesselPressuresLoading = false;
        // Убеждаемся, что это массив (может прийти null или undefined)
        state.myVesselPressures = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getMyVesselPressuresAsync.rejected, (state, action) => {
        state.myVesselPressuresLoading = false;
        state.error = action.payload as string;
      })
      // submitVesselPressureAsync
      .addCase(submitVesselPressureAsync.fulfilled, (state) => {
        state.isDraft = false;
        // Можно обновить статус в списке заявок
      })
      .addCase(submitVesselPressureAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateGasInVesselPressureAsync
      .addCase(updateGasInVesselPressureAsync.fulfilled, (state, action) => {
        const { gasId, data } = action.payload;
        const gas = state.gases.find((g) => g.gas?.id === gasId);
        if (gas) {
          if (data.quantity !== undefined) gas.quantity = data.quantity;
          if (data.sound !== undefined) gas.sound = data.sound;
          if (data.position !== undefined) gas.position = data.position;
        }
      })
      .addCase(updateGasInVesselPressureAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setAppId,
  setCount,
  setVesselPressureData,
  setGases,
  setError,
  clearVesselPressure,
  updateGasVesselPressureFields,
  clearMyVesselPressures,
} = vesselPressureSlice.actions;

export default vesselPressureSlice.reducer;


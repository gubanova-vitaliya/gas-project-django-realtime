# Документация по использованию Redux и Axios в проекте

## Содержание
1. [Архитектура Redux в проекте](#архитектура-redux-в-проекте)
2. [Использование Axios для HTTP-запросов](#использование-axios-для-http-запросов)
3. [Интеграция Redux с Axios через createAsyncThunk](#интеграция-redux-с-axios-через-createasyncthunk)
4. [Использование сгенерированного кода из Swagger](#использование-сгенерированного-кода-из-swagger)
5. [Примеры из реального кода](#примеры-из-реального-кода)

---

## Архитектура Redux в проекте

### Структура Redux Store

Проект использует **Redux Toolkit** для управления состоянием. Централизованное хранилище находится в `src/store.ts`:

```typescript
// src/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import gasCalculationReducer from "./slices/dataSlice";
import gasReducer from "./slices/gasSlice";
import cartReducer from "./slices/cartSlice";
import userReducer from "./slices/userSlice";
import calculationReducer from "./slices/calculationSlice";

// Объединение всех редьюсеров
const rootReducer = combineReducers({
  gasCalculation: gasCalculationReducer,
  gas: gasReducer,
  cart: cartReducer,
  user: userReducer,
  calculation: calculationReducer,
});

// Создание и настройка хранилища
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Пояснение:**
- `combineReducers` объединяет все слайсы в единое дерево состояния
- `configureStore` настраивает store с поддержкой Redux DevTools
- Экспортируются типы `RootState` и `AppDispatch` для типобезопасности

### Подключение Redux к React

В `src/main.tsx` Redux Store оборачивает всё приложение через `Provider`:

```typescript
// src/main.tsx
import { Provider } from 'react-redux'
import store from './store'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={getDestRoot()}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
```

---

## Использование Axios для HTTP-запросов

### Установка и базовая конфигурация

Axios используется для выполнения HTTP-запросов к API. Пример импорта:

```typescript
import axios from 'axios';
```

### Базовая структура запроса с Axios

#### 1. GET-запрос (получение данных)

```typescript
// Пример из src/slices/userSlice.ts
const response = await axios.get(`${apiBase}/api/users/me`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

return response.data; // Получаем данные из ответа
```

**Пояснение:**
- `axios.get()` выполняет GET-запрос
- Второй параметр - объект конфигурации (headers, params и т.д.)
- `response.data` содержит данные ответа сервера

#### 2. POST-запрос (создание/авторизация)

```typescript
// Пример из src/slices/userSlice.ts - авторизация
const response = await axios.post(`${apiBase}/api/auth/login`, {
  login: credentials.login,
  password: credentials.password,
});

// Пример из src/slices/userSlice.ts - регистрация
const response = await axios.post(`${apiBase}/api/auth/register`, requestData, {
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Пояснение:**
- Первый параметр - URL эндпоинта
- Второй параметр - тело запроса (данные)
- Третий параметр (опционально) - конфигурация (headers)

#### 3. PUT-запрос (обновление данных)

```typescript
// Пример из src/slices/calculationSlice.ts
const response = await axios.put(
  `${apiBase}/api/mm/gas/${gasId}`,
  data, // Данные для обновления
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

#### 4. DELETE-запрос (удаление данных)

```typescript
// Пример из src/slices/calculationSlice.ts
await axios.delete(`${apiBase}/api/mm/gas/${gasCalculationId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Обработка ошибок в Axios

```typescript
try {
  const response = await axios.get(`${apiBase}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
} catch (error: any) {
  // Обработка ошибок
  if (error.response?.status === 404) {
    return rejectWithValue('Ресурс не найден');
  }
  if (error.response?.status === 401 || error.response?.status === 403) {
    return rejectWithValue('Нет доступа');
  }
  return rejectWithValue('Ошибка при загрузке данных');
}
```

**Пояснение:**
- `error.response` содержит ответ сервера
- `error.response.status` - HTTP статус код
- `error.response.data` - тело ответа с ошибкой

---

## Интеграция Redux с Axios через createAsyncThunk

### Структура Redux Slice

Redux Toolkit использует `createSlice` для создания слайсов состояния. Пример из `src/slices/userSlice.ts`:

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// 1. Определяем интерфейсы состояния
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

// 2. Начальное состояние
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
```

### Создание асинхронных действий (createAsyncThunk)

`createAsyncThunk` используется для создания асинхронных действий, которые выполняют HTTP-запросы через Axios:

```typescript
// Пример: Асинхронное действие для авторизации
export const loginUserAsync = createAsyncThunk(
  'user/loginUserAsync', // Префикс действия (для отслеживания в DevTools)
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      
      // Выполняем HTTP-запрос через Axios
      const response = await axios.post(`${apiBase}/api/auth/login`, {
        login: credentials.login,
        password: credentials.password,
      });
      
      // Сохраняем токен в localStorage
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      
      // Возвращаем данные для редьюсера
      return {
        username: response.data.user?.login || credentials.login,
        name: response.data.user?.name || '',
        email: response.data.user?.email || '',
        uuid: response.data.user?.uuid || '',
        token: response.data.access_token,
      };
    } catch (error: any) {
      // При ошибке возвращаем отклонённое значение
      return rejectWithValue('Ошибка авторизации');
    }
  }
);
```

**Пояснение:**
- Первый параметр - строка-префикс (используется для генерации action типов)
- Второй параметр - асинхронная функция, которая:
  - Принимает параметры действия (например, credentials)
  - Может использовать `getState`, `dispatch`, `rejectWithValue` из второго параметра
  - Возвращает данные при успехе или вызывает `rejectWithValue` при ошибке

### Обработка асинхронных действий в Reducers

Для обработки асинхронных действий используются `extraReducers`:

```typescript
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Синхронные редьюсеры
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Обработка состояния "pending" (запрос отправлен)
      .addCase(loginUserAsync.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      // Обработка успешного выполнения
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.username = action.payload.username;
        state.name = action.payload.name;
        state.email = action.payload.email;
        state.uuid = action.payload.uuid;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.error = null;
        state.loading = false;
      })
      // Обработка ошибки
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
      });
  },
});
```

**Пояснение:**
- `pending` - состояние загрузки (запрос отправлен, ответа нет)
- `fulfilled` - успешное выполнение (`action.payload` содержит возвращённые данные)
- `rejected` - ошибка (`action.payload` содержит значение из `rejectWithValue`)

### Использование в компонентах

В React-компонентах асинхронные действия вызываются через `dispatch`:

```typescript
// Пример из src/pages/LoginPage.tsx
import { useDispatch } from 'react-redux';
import { loginUserAsync } from '../slices/userSlice';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.login && formData.password) {
      // Диспатчим асинхронное действие
      const result = await dispatch(loginUserAsync(formData));
      
      // Проверяем результат
      if (loginUserAsync.fulfilled.match(result)) {
        // Действия при успешной авторизации
        navigate(ROUTES.GASES);
      }
    }
  };
  
  // ...
};
```

**Пояснение:**
- `dispatch(asyncAction(params))` возвращает Promise
- Можно проверить результат через `.match()` или через `result.type`

### Использование селекторов

Для получения данных из store используются селекторы:

```typescript
// Пример из src/pages/GasesPage.tsx
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const GasesPage: FC = () => {
  // Получаем данные из store
  const gases = useSelector((state: RootState) => state.gas.filteredGases);
  const loading = useSelector((state: RootState) => state.gas.loading);
  const error = useSelector((state: RootState) => state.gas.error);
  
  // ...
};
```

**Использование типизированных хуков:**

```typescript
// src/hooks/useTypedRedux.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// В компонентах:
import { useAppDispatch, useAppSelector } from '../hooks/useTypedRedux';

const gases = useAppSelector((state) => state.gas.filteredGases);
const dispatch = useAppDispatch();
```

---

## Использование сгенерированного кода из Swagger

### Генерация API клиента

В проекте есть скрипт для генерации TypeScript API клиента из Swagger спецификации:

```javascript
// scripts/generate-api.mjs
import { generateApi } from 'swagger-typescript-api';

generateApi({
    name: 'Api.ts',
    output: resolve(__dirname, '../src/api'),
    url: 'http://localhost:8080/swagger/doc.json', // URL к Swagger JSON
    httpClientType: 'axios', // Используется Axios как HTTP клиент
    generateClient: true,
    generateRouteTypes: true,
    generateResponses: true,
    toJS: false,
    extractRequestParams: true,
    extractRequestBody: true,
    extractEnums: true,
    unwrapResponseData: false,
    defaultResponseAsSuccess: false,
    generateUnionEnums: false,
    cleanOutput: true,
});
```

**Запуск генерации:**
```bash
npm run generate-api
```

### Пример использования сгенерированного API

После генерации, API клиент будет находиться в `src/api/Api.ts`. Пример использования:

```typescript
// Предполагаемая структура сгенерированного API
import { Api } from '../api/Api';

// Инициализация API клиента
const api = new Api({
  baseURL: getDestApi(),
  headers: {
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  },
});

// Использование в createAsyncThunk
export const loginUserAsync = createAsyncThunk(
  'user/loginUserAsync',
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      // Использование сгенерированного метода
      const response = await api.auth.login({
        login: credentials.login,
        password: credentials.password,
      });
      
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
```

### Преимущества использования сгенерированного API

1. **Типобезопасность**: Все методы и типы генерируются из Swagger спецификации
2. **Автодополнение**: IDE будет подсказывать доступные методы и параметры
3. **Синхронизация**: Изменения в API автоматически отражаются в типах после регенерации
4. **Меньше ручной работы**: Не нужно вручную писать интерфейсы запросов/ответов

### Текущее состояние проекта

В текущей реализации проекта используется прямой вызов Axios вместо сгенерированного API, но архитектура позволяет легко мигрировать на сгенерированный клиент:

**Текущий подход (прямой Axios):**
```typescript
const response = await axios.post(`${apiBase}/api/auth/login`, {
  login: credentials.login,
  password: credentials.password,
});
```

**Альтернативный подход (сгенерированный API):**
```typescript
const response = await api.auth.login({
  login: credentials.login,
  password: credentials.password,
});
```

📝 **Подробный пример использования сгенерированного API:** см. файл `src/examples/SwaggerGeneratedApiExample.ts`

---

## Примеры из реального кода

### Пример 1: Полный цикл авторизации пользователя

**Slice (src/slices/userSlice.ts):**

```typescript
// Асинхронное действие
export const loginUserAsync = createAsyncThunk(
  'user/loginUserAsync',
  async (credentials: { login: string; password: string }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const response = await axios.post(`${apiBase}/api/auth/login`, {
        login: credentials.login,
        password: credentials.password,
      });
      
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      
      return {
        username: response.data.user?.login || credentials.login,
        name: response.data.user?.name || '',
        email: response.data.user?.email || '',
        uuid: response.data.user?.uuid || '',
        token: response.data.access_token,
      };
    } catch (error: any) {
      return rejectWithValue('Ошибка авторизации');
    }
  }
);

// Reducer
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUserAsync.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.username = action.payload.username;
        state.name = action.payload.name;
        state.email = action.payload.email;
        state.uuid = action.payload.uuid;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.error = null;
        state.loading = false;
      })
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
      });
  },
});
```

**Компонент (src/pages/LoginPage.tsx):**

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loginUserAsync } from '../slices/userSlice';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector((state: RootState) => state.user.error);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.login && formData.password) {
      const result = await dispatch(loginUserAsync(formData));
      if (loginUserAsync.fulfilled.match(result)) {
        dispatch(clearCart());
        dispatch(clearCalculation());
        await dispatch(getUserProfileAsync());
        navigate(ROUTES.GASES);
      }
    }
  };
  
  return (
    // JSX компонента
  );
};
```

### Пример 2: Загрузка списка газов с фильтрацией

**Slice (src/slices/gasSlice.ts):**

```typescript
// Асинхронное действие для загрузки газов
export const getGasesList = createAsyncThunk(
  'gas/getGasesList',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const searchValue = state.gas?.searchValue || '';
      
      // Используем функцию из gasApi.ts (которая внутри использует fetch, не axios)
      const gases = await getGases({ search: searchValue || undefined });
      
      return gases;
    } catch (error: any) {
      // В случае ошибки используем mock данные
      const state = getState() as any;
      const searchValue = state.gas?.searchValue || '';
      let mockGases = [...GASES_MOCK];
      
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        mockGases = mockGases.filter(
          (gas) =>
            gas.title.toLowerCase().includes(searchLower) ||
            gas.formula.toLowerCase().includes(searchLower)
        );
      }
      
      return rejectWithValue(mockGases);
    }
  }
);

// Reducer
const gasSlice = createSlice({
  name: "gas",
  initialState,
  reducers: {
    setSearchValue(state, action: PayloadAction<string>) {
      state.searchValue = action.payload;
      state.filters.search = action.payload || undefined;
      applyFilters(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getGasesList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGasesList.fulfilled, (state, action) => {
        state.loading = false;
        state.gases = action.payload;
        applyFilters(state);
      })
      .addCase(getGasesList.rejected, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.gases = action.payload;
          applyFilters(state);
        } else {
          state.error = 'Ошибка при загрузке данных';
        }
      });
  },
});
```

**Компонент (src/pages/GasesPage.tsx):**

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { getGasesList, setSearchValue, useFilteredGases, useGasLoading } from '../slices/gasSlice';

export const GasesPage: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const gases = useFilteredGases(); // Кастомный селектор
  const loading = useGasLoading();
  const searchValue = useGasSearchValue();
  
  // Загрузка данных через Redux Thunk
  useEffect(() => {
    dispatch(getGasesList());
  }, [dispatch]);
  
  return (
    <div>
      <input
        value={searchValue}
        onChange={(e) => {
          dispatch(setSearchValue(e.target.value));
        }}
      />
      <Button onClick={() => dispatch(getGasesList())}>Найти</Button>
      {loading && <Spinner />}
      {gases.map((gas) => <GasCardItem key={gas.id} gas={gas} />)}
    </div>
  );
};
```

### Пример 3: Сложный запрос с обновлением параметров

**Slice (src/slices/calculationSlice.ts):**

```typescript
// Расчет финального давления для газа в расчете
export const calculateFinalPressure = createAsyncThunk(
  'calculation/calculateFinalPressure',
  async ({ gasId, params }: { gasId: number; params: any }, { rejectWithValue }) => {
    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      // Рассчитываем финальное давление по формуле идеального газа
      const finalPressure = 
        (params.initial_pressure * params.initial_volume * params.final_temperature) /
        (params.volume * params.initial_temperature);
      
      // Отправляем все параметры и результат на сервер
      const data = {
        initial_pressure: params.initial_pressure,
        initial_volume: params.initial_volume,
        initial_temperature: params.initial_temperature,
        final_temperature: params.final_temperature,
        volume: params.volume,
        gas_amount: params.gas_amount,
        final_pressure: finalPressure,
      };
      
      const response = await axios.put(`${apiBase}/api/mm/gas/${gasId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return { gasCalculationId: gasId, ...data };
    } catch (error: any) {
      return rejectWithValue('Ошибка при расчете давления');
    }
  }
);
```

**Компонент (src/pages/JournalPage.tsx):**

```typescript
const handleCalculate = async (gasCalcId: number, gasId: number) => {
  const params = gasParams[gasCalcId];
  if (params && params.initial_pressure !== null && params.initial_temperature !== null && 
      params.final_temperature !== null && params.volume !== null && app_id) {
    // Диспатчим асинхронное действие
    const result = await dispatch(calculateFinalPressure({
      gasId: gasCalcId,
      params: {
        initial_pressure: params.initial_pressure,
        initial_volume: params.initial_volume,
        initial_temperature: params.initial_temperature,
        final_temperature: params.final_temperature,
        volume: params.volume,
        gas_amount: params.gas_amount,
      },
    }));
    
    if (calculateFinalPressure.fulfilled.match(result)) {
      // Обновляем локальное состояние
      setGasParams((prev) => ({
        ...prev,
        [gasCalcId]: {
          ...prev[gasCalcId],
          final_pressure: result.payload.final_pressure,
        },
      }));
    }
  }
};
```

---

## Описание проекта

### Объект разработки

Объектом разработки является система для расчёта параметров газов по уравнениям состояния (идеальный газ, Менделеева-Клапейрона), позволяющая исследователям оформлять заявки на расчёт давления, объёма и других термодинамических параметров газов, а администраторам и модераторам – управлять каталогом газов и обрабатывать данные заявки.

### Цель работы

Цель работы заключается в разработке системы, включающей в себя основной веб-сервис на Go (Gin framework), веб-приложение на React с Redux, и нативное приложение на Tauri, которая позволит исследователям создавать заявки на расчет параметров газов, выбирать газы из каталога, задавать начальные и конечные условия (давление, температуру, объём), а администраторам и модераторам – управлять каталогом газов, просматривать и обрабатывать заявки исследователей.

### Результаты выполнения работы

В ходе выполнения работы была разработана архитектура основного веб-сервиса, реализованы и развернуты основной веб-сервис на Go для управления каталогом газов, обработки заявок и выполнения расчётов термодинамических параметров газов по уравнениям состояния (формула идеального газа: P2 = P1 * V1 * T2 / (V2 * T1) и уравнение Менделеева-Клапейрона: P = nRT/V), разработан интерфейс для взаимодействия с основным веб-сервисом на базе React с использованием Redux для управления состоянием и Axios для HTTP-запросов, созданы нативное приложение на Tauri и прогрессивное веб-приложение (PWA), способные общаться с основным веб-сервисом через RESTful API.

---

## Резюме

### Основные концепции

1. **Redux Toolkit** используется для управления глобальным состоянием приложения
2. **Axios** используется для выполнения HTTP-запросов к API
3. **createAsyncThunk** связывает Redux и Axios, позволяя выполнять асинхронные действия
4. **Сгенерированный API из Swagger** может быть использован вместо прямых вызовов Axios для типобезопасности

### Паттерн использования

1. Создать асинхронное действие через `createAsyncThunk`
2. Внутри действия выполнить HTTP-запрос через `axios`
3. Обработать результат в `extraReducers` (pending/fulfilled/rejected)
4. Вызвать действие в компоненте через `dispatch`
5. Получить данные через селекторы (`useSelector`)

### Преимущества подхода

- **Централизованное управление состоянием**: Все данные в одном месте
- **Предсказуемость**: Чёткий поток данных (action → reducer → state)
- **Отладка**: Redux DevTools для отслеживания всех действий
- **Масштабируемость**: Легко добавлять новые слайсы и действия
- **Типобезопасность**: TypeScript типы для всех действий и состояний


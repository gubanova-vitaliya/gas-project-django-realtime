# Использование Redux Thunk и демонстрация работы иконки корзины на Svelte

## Содержание

1. [Обзор Redux Thunk](#обзор-redux-thunk)
2. [Все thunk в проекте](#все-thunk-в-проекте)
3. [Использование thunk в компонентах](#использование-thunk-в-компонентах)
4. [Демонстрация работы иконки корзины на Svelte](#демонстрация-работы-иконки-корзины-на-svelte)
5. [Практические примеры](#практические-примеры)

---

## Обзор Redux Thunk

### Что такое Redux Thunk?

Redux Thunk - это middleware для Redux, который позволяет создавать асинхронные action creators (thunk). Thunk - это функция, которая возвращает другую функцию вместо обычного action объекта.

### Зачем нужен Redux Thunk?

- **Асинхронные операции**: HTTP-запросы, работа с API
- **Условная диспетчеризация**: Вызов других actions в зависимости от результата
- **Доступ к state**: Получение текущего состояния перед выполнением операции
- **Обработка ошибок**: Централизованная обработка ошибок

### Структура thunk

```typescript
export const myAsyncThunk = createAsyncThunk(
  'sliceName/actionName',  // Тип action
  async (payload, { rejectWithValue }) => {
    try {
      // Асинхронная операция
      const response = await axios.get('/api/data');
      return response.data;  // fulfilled payload
    } catch (error) {
      return rejectWithValue('Ошибка');  // rejected payload
    }
  }
);
```

---

## Все thunk в проекте

### 1. vesselPressureSlice.ts

#### 1.1. `getVesselPressure`
**Назначение**: Получение данных заявки по ID

**Параметры**: `appId: string`

**API**: `GET /api/vessel-pressures/{appId}`

**Использование**:
```typescript
dispatch(getVesselPressure('123'));
```

**Состояния**:
- `pending`: Загрузка данных
- `fulfilled`: Данные получены
- `rejected`: Ошибка загрузки

---

#### 1.2. `addGasToVesselPressure`
**Назначение**: Добавление газа в черновик заявки

**Параметры**: `gasId: number`

**API**: `POST /api/gases/{gasId}/add-to-draft`

**Использование**:
```typescript
dispatch(addGasToVesselPressure(4));
```

**Состояния**:
- `pending`: Добавление газа
- `fulfilled`: Газ добавлен
- `rejected`: Ошибка добавления

---

#### 1.3. `deleteVesselPressure`
**Назначение**: Удаление заявки

**Параметры**: `appId: string`

**API**: `DELETE /api/vessel-pressures/{appId}`

**Использование**:
```typescript
dispatch(deleteVesselPressure('123'));
```

**Состояния**:
- `pending`: Удаление заявки
- `fulfilled`: Заявка удалена
- `rejected`: Ошибка удаления

---

#### 1.4. `updateVesselPressure`
**Назначение**: Обновление полей заявки (text)

**Параметры**: `{ appId: string, vesselPressureData: VesselPressureData }`

**API**: `PUT /api/vessel-pressures/{appId}`

**Использование**:
```typescript
dispatch(updateVesselPressure({
  appId: '123',
  vesselPressureData: { text: 'Новое название' }
}));
```

**Состояния**:
- `pending`: Обновление данных
- `fulfilled`: Данные обновлены
- `rejected`: Ошибка обновления

---

#### 1.5. `deleteGasFromVesselPressure`
**Назначение**: Удаление газа из заявки (удаление в многие-ко-многим)

**Параметры**: `gasCalculationId: number` (ID из таблицы gas_calculations)

**API**: `DELETE /api/mm/gas/{gasCalculationId}`

**Использование**:
```typescript
dispatch(deleteGasFromVesselPressure(15));
```

**Состояния**:
- `pending`: Удаление газа
- `fulfilled`: Газ удален
- `rejected`: Ошибка удаления

**Важно**: Используется для удаления связи в таблице `gas_calculations` (многие-ко-многим).

---

#### 1.6. `getDraftVesselPressureAsync`
**Назначение**: Получение текущего черновика пользователя

**Параметры**: Нет

**API**: `GET /api/my-draft`

**Использование**:
```typescript
dispatch(getDraftVesselPressureAsync());
```

**Состояния**:
- `pending`: Загрузка черновика
- `fulfilled`: Черновик получен (или null, если нет)
- `rejected`: Ошибка загрузки

---

#### 1.7. `getAllDraftsAsync`
**Назначение**: Получение всех черновиков пользователя

**Параметры**: Нет

**API**: `GET /api/my-drafts`

**Использование**:
```typescript
dispatch(getAllDraftsAsync());
```

**Состояния**:
- `pending`: Загрузка черновиков
- `fulfilled`: Черновики получены (массив)
- `rejected`: Ошибка загрузки

---

#### 1.8. `getMyVesselPressuresAsync`
**Назначение**: Получение списка всех заявок пользователя

**Параметры**: Нет

**API**: `GET /api/my-vessel-pressures`

**Использование**:
```typescript
dispatch(getMyVesselPressuresAsync());
```

**Состояния**:
- `pending`: Загрузка заявок
- `fulfilled`: Заявки получены (массив)
- `rejected`: Ошибка загрузки

---

#### 1.9. `submitVesselPressureAsync`
**Назначение**: Подтверждение заявки (старый метод)

**Параметры**: `appId: string`

**API**: `POST /api/vessel-pressures/{appId}/submit`

**Использование**:
```typescript
dispatch(submitVesselPressureAsync('123'));
```

**Состояния**:
- `pending`: Подтверждение заявки
- `fulfilled`: Заявка подтверждена
- `rejected`: Ошибка подтверждения

---

#### 1.10. `markVesselPressureAsDeleted`
**Назначение**: Удаление заявки (изменение статуса на "Удалена")

**Параметры**: `appId: string`

**API**: `DELETE /api/vessel-pressures/{appId}`

**Использование**:
```typescript
dispatch(markVesselPressureAsDeleted('123'));
```

**Состояния**:
- `pending`: Удаление заявки
- `fulfilled`: Заявка удалена
- `rejected`: Ошибка удаления

**Примечание**: Используется в кнопке "3) Удалить" в JournalPage.

---

#### 1.11. `updateVesselPressureText`
**Назначение**: Обновление названия заявки (text)

**Параметры**: `{ appId: string, text: string }`

**API**: `PUT /api/vessel-pressures/{appId}`

**Использование**:
```typescript
dispatch(updateVesselPressureText({
  appId: '123',
  text: 'Новое название заявки'
}));
```

**Состояния**:
- `pending`: Обновление названия
- `fulfilled`: Название обновлено
- `rejected`: Ошибка обновления

**Примечание**: Используется в кнопке "1) Сохранить" в JournalPage.

---

#### 1.12. `markVesselPressureAsFormed`
**Назначение**: Формирование заявки (изменение статуса на "Сформирована")

**Параметры**: `appId: string`

**API**: `POST /api/vessel-pressures/{appId}/submit` или `PUT /api/vessel-pressures/{appId}` с `{ status: 'formed' }`

**Использование**:
```typescript
dispatch(markVesselPressureAsFormed('123'));
```

**Состояния**:
- `pending`: Формирование заявки
- `fulfilled`: Заявка сформирована
- `rejected`: Ошибка формирования

**Примечание**: Используется в кнопке "2) Сформировать" в JournalPage.

---

#### 1.13. `updateGasInVesselPressureAsync`
**Назначение**: Обновление количества/параметров газа в заявке (редактирование в многие-ко-многим)

**Параметры**: `{ gasId: number, data: { quantity?: number, sound?: boolean, position?: number } }`

**API**: `PUT /api/mm/gas/{gasId}`

**Использование**:
```typescript
dispatch(updateGasInVesselPressureAsync({
  gasId: 15,
  data: { quantity: 5, sound: true, position: 1 }
}));
```

**Состояния**:
- `pending`: Обновление параметров газа
- `fulfilled`: Параметры обновлены
- `rejected`: Ошибка обновления

**Примечание**: Используется для обновления полей в таблице `gas_calculations` (многие-ко-многим).

---

#### 1.14. `calculateFinalPressure`
**Назначение**: Расчет финального давления и сохранение на сервере

**Параметры**: 
```typescript
{
  appId: number;
  gasId: number;
  initial_pressure: number;
  initial_volume: number;
  initial_temperature: number;
  final_volume: number;
  final_temperature: number;
}
```

**API**: `PUT /api/mm/gas/{gasVesselPressureId}`

**Использование**:
```typescript
dispatch(calculateFinalPressure({
  appId: 123,
  gasId: 15,
  initial_pressure: 1.0,
  initial_volume: 0.001,
  initial_temperature: 273.15,
  final_volume: 0.002,
  final_temperature: 373.15
}));
```

**Особенности**:
- Выполняет расчет по формуле: `P2 = P1 * V1 * T2 / (V2 * T1)`
- Сохраняет результат на сервере
- Обновляет параметры в таблице `gas_calculations`

**Состояния**:
- `pending`: Расчет давления
- `fulfilled`: Давление рассчитано и сохранено
- `rejected`: Ошибка расчета

---

## Использование thunk в компонентах

### Базовый пример

```typescript
import { useDispatch } from 'react-redux';
import { getVesselPressure } from '../slices/vesselPressureSlice';

const MyComponent = () => {
  const dispatch = useDispatch();

  const handleLoad = async () => {
    const result = await dispatch(getVesselPressure('123'));
    
    if (getVesselPressure.fulfilled.match(result)) {
      console.log('Данные загружены:', result.payload);
    } else if (getVesselPressure.rejected.match(result)) {
      console.error('Ошибка:', result.payload);
    }
  };

  return <button onClick={handleLoad}>Загрузить</button>;
};
```

### Обработка состояний загрузки

```typescript
import { useSelector } from 'react-redux';

const MyComponent = () => {
  const { loading, error, data } = useSelector((state) => state.vesselPressure);

  if (loading) return <Spinner />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  return <div>{/* Данные */}</div>;
};
```

### Использование в JournalPage

```typescript
// Получение всех черновиков
useEffect(() => {
  if (isAuthenticated) {
    dispatch(getAllDraftsAsync());
  }
}, [dispatch, isAuthenticated]);

// Обработчик сохранения названия
const handleSaveDraftText = async (draftId: number) => {
  const text = draftTexts[draftId] || '';
  const result = await dispatch(updateVesselPressureText({
    appId: draftId.toString(),
    text
  }));
  
  if (updateVesselPressureText.fulfilled.match(result)) {
    dispatch(getAllDraftsAsync()); // Перезагружаем черновики
  }
};
```

---

## Демонстрация работы иконки корзины на Svelte

### Шаг 1: Запуск приложения

```bash
cd gase-frontend
npm run dev
```

Приложение будет доступно по адресу: `https://localhost:3000`

### Шаг 2: Авторизация

1. Откройте `https://localhost:3000`
2. Нажмите "Войти"
3. Введите логин и пароль
4. Нажмите "Войти"

### Шаг 3: Переход на страницу газов

1. В навигационной панели нажмите "Газы"
2. Или перейдите по адресу: `https://localhost:3000/gases`

### Шаг 4: Обнаружение иконки корзины

**Где находится иконка:**
- Иконка корзины находится **под заголовком "Газы"** справа
- Иконка представляет собой **сосуд с газом и манометром** (SVG)
- Если в журнале есть газы, отображается **красный бейдж с количеством**

**Визуальные характеристики:**
- Синяя кнопка с белой иконкой
- При наведении: темнеет и поднимается вверх
- Если журнал пуст: серая кнопка с пониженной прозрачностью

### Шаг 5: Добавление газов в журнал

1. На странице `/gases` найдите газ в списке
2. Нажмите на карточку газа
3. На странице деталей газа нажмите кнопку "Добавить в журнал"
4. Газ будет добавлен в черновик

**Что происходит:**
- Вызывается thunk `addGasToVesselPressure(gasId)`
- Газ добавляется в таблицу `gas_calculations` (многие-ко-многим)
- Иконка корзины обновляется через 5 секунд (автообновление)

### Шаг 6: Наблюдение за обновлением иконки

**Автообновление:**
- Иконка корзины обновляет данные каждые **5 секунд**
- Количество газов в бейдже обновляется автоматически
- Если журнал пуст, бейдж исчезает

**Как проверить:**
1. Добавьте газ в журнал
2. Подождите до 5 секунд
3. Бейдж с количеством должен появиться/обновиться

### Шаг 7: Переход на страницу журнала

**Способ 1: Через иконку корзины**
1. Нажмите на иконку корзины под заголовком "Газы"
2. Произойдет переход на `/journal`

**Способ 2: Прямой переход**
1. Введите в адресной строке: `https://localhost:3000/journal`
2. Нажмите Enter

**Что происходит при клике:**
```typescript
// В CartIcon.svelte
const handleClick = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (navigate && typeof navigate === 'function') {
    navigate('/journal');  // Используется React Router
  } else {
    window.location.href = `${window.location.origin}/journal`;  // Запасной вариант
  }
};
```

### Шаг 8: Просмотр черновиков

На странице `/journal` отображаются все черновики пользователя:

**Структура черновика:**
- Заголовок: "Черновик #{id}"
- Поле для названия заявки
- Список газов с параметрами
- Кнопки действий

**Кнопки для черновика (5 кнопок):**

1. **"1) Сохранить"** - Сохраняет название заявки
   - Использует: `updateVesselPressureText`
   - API: `PUT /api/vessel-pressures/{id}`

2. **"2) Сформировать"** - Меняет статус на "Сформирована"
   - Использует: `markVesselPressureAsFormed`
   - API: `POST /api/vessel-pressures/{id}/submit`
   - Активна только если все параметры заполнены

3. **"3) Удалить"** - Удаляет черновик
   - Использует: `markVesselPressureAsDeleted`
   - API: `DELETE /api/vessel-pressures/{id}`

4. **"4) Удалить в многие-ко-многим"** - Удаляет газ из черновика
   - Использует: `deleteGasFromVesselPressure`
   - API: `DELETE /api/mm/gas/{gasCalculationId}`
   - Удаляет запись из таблицы `gas_calculations`

5. **"5) Редактировать в многие-ко-многим"** - Сохраняет параметры газа
   - Использует: `PUT /api/mm/gas/{gasCalculationId}`
   - Обновляет параметры в таблице `gas_calculations`

### Шаг 9: Демонстрация работы кнопок

#### Кнопка "1) Сохранить"

1. Введите название заявки в поле "Название заявки"
2. Нажмите "1) Сохранить"
3. Название сохранится на сервере
4. Черновики перезагрузятся

**Что происходит:**
```typescript
const handleSaveDraftText = async (draftId: number) => {
  const text = draftTexts[draftId] || '';
  const result = await dispatch(updateVesselPressureText({
    appId: draftId.toString(),
    text
  }));
  
  if (updateVesselPressureText.fulfilled.match(result)) {
    dispatch(getAllDraftsAsync()); // Перезагружаем
  }
};
```

#### Кнопка "2) Сформировать"

1. Заполните все параметры для всех газов:
   - Начальное давление
   - Начальная температура
   - Конечная температура
   - Объем
   - Количество вещества
2. Нажмите "2) Сформировать"
3. Статус черновика изменится на "Сформирована"
4. Черновик исчезнет из списка (т.к. показываются только черновики)

**Что происходит:**
```typescript
const handleFormCalculation = async (draftId: number) => {
  const result = await dispatch(markVesselPressureAsFormed(draftId.toString()));
  if (markVesselPressureAsFormed.fulfilled.match(result)) {
    dispatch(getAllDraftsAsync()); // Обновляем список
  }
};
```

#### Кнопка "3) Удалить"

1. Нажмите "3) Удалить" в заголовке черновика
2. Черновик будет удален
3. Черновик исчезнет из списка

**Что происходит:**
```typescript
const handleDeleteCalculation = async (draftId: number) => {
  const result = await dispatch(markVesselPressureAsDeleted(draftId.toString()));
  if (markVesselPressureAsDeleted.fulfilled.match(result)) {
    dispatch(getAllDraftsAsync()); // Обновляем список
  }
};
```

#### Кнопка "4) Удалить в многие-ко-многим"

1. Найдите газ в черновике
2. Нажмите "4) Удалить в многие-ко-многим"
3. Газ будет удален из черновика
4. Связь в таблице `gas_calculations` будет удалена

**Что происходит:**
```typescript
const handleDeleteGas = async (gasCalcId: number) => {
  const result = await dispatch(deleteGasFromVesselPressure(gasCalcId));
  if (deleteGasFromVesselPressure.fulfilled.match(result)) {
    dispatch(getAllDraftsAsync()); // Перезагружаем
  }
};
```

**Важно**: `gasCalcId` - это ID из таблицы `gas_calculations`, а не ID газа.

#### Кнопка "5) Редактировать в многие-ко-многим"

1. Измените параметры газа:
   - Начальное давление
   - Начальная температура
   - Конечная температура
   - Объем
   - Количество вещества
2. Нажмите "5) Редактировать в многие-ко-многим"
3. Параметры сохранятся в таблице `gas_calculations`
4. Черновики перезагрузятся

**Что происходит:**
```typescript
const handleEditGasParams = async (draftId: number, gasCalcId: number) => {
  const key = `${draftId}_${gasCalcId}`;
  const params = gasParams[key];
  
  await axios.put(
    `${apiBase}/api/mm/gas/${gasCalcId}`,
    {
      initial_pressure: params.initial_pressure,
      initial_temperature: params.initial_temperature,
      final_temperature: params.final_temperature,
      volume: params.volume,
      gas_amount: params.gas_amount,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  dispatch(getAllDraftsAsync()); // Перезагружаем
};
```

---

## Практические примеры

### Пример 1: Полный цикл работы с черновиком

1. **Добавление газов:**
   ```typescript
   // На странице /gases
   dispatch(addGasToVesselPressure(4)); // Добавить газ с ID 4
   dispatch(addGasToVesselPressure(5)); // Добавить газ с ID 5
   ```

2. **Просмотр черновика:**
   - Перейти на `/journal`
   - Или кликнуть на иконку корзины

3. **Сохранение названия:**
   ```typescript
   dispatch(updateVesselPressureText({
     appId: '123',
     text: 'Мой черновик'
   }));
   ```

4. **Редактирование параметров газа:**
   - Изменить параметры в форме
   - Нажать "5) Редактировать в многие-ко-многим"

5. **Удаление газа:**
   ```typescript
   dispatch(deleteGasFromVesselPressure(15)); // gasCalculationId
   ```

6. **Формирование заявки:**
   ```typescript
   dispatch(markVesselPressureAsFormed('123'));
   ```

7. **Удаление черновика:**
   ```typescript
   dispatch(markVesselPressureAsDeleted('123'));
   ```

### Пример 2: Отслеживание состояния загрузки

```typescript
const JournalPage = () => {
  const dispatch = useDispatch();
  const { allDrafts, allDraftsLoading, error } = useSelector(
    (state) => state.vesselPressure
  );

  useEffect(() => {
    dispatch(getAllDraftsAsync());
  }, [dispatch]);

  if (allDraftsLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      {allDrafts.map((draft) => (
        <Card key={draft.id}>
          {/* ... */}
        </Card>
      ))}
    </div>
  );
};
```

### Пример 3: Обработка ошибок

```typescript
const handleSave = async () => {
  const result = await dispatch(updateVesselPressureText({
    appId: '123',
    text: 'Название'
  }));

  if (updateVesselPressureText.fulfilled.match(result)) {
    console.log('Успешно сохранено');
  } else if (updateVesselPressureText.rejected.match(result)) {
    console.error('Ошибка:', result.payload);
    alert('Не удалось сохранить: ' + result.payload);
  }
};
```

---

## Заключение

### Ключевые моменты

1. **Redux Thunk** позволяет выполнять асинхронные операции в Redux
2. **Все thunk** в проекте находятся в `vesselPressureSlice.ts`
3. **Иконка корзины** на Svelte демонстрирует микрофронтенд архитектуру
4. **5 кнопок** в JournalPage реализуют все необходимые операции с черновиками
5. **Многие-ко-многим** операции работают через таблицу `gas_calculations`

### Полезные ссылки

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux Thunk](https://github.com/reduxjs/redux-thunk)
- [React Router](https://reactrouter.com/)
- [Svelte Documentation](https://svelte.dev/docs)

---

**Дата создания**: 2026-01-19  
**Версия**: 1.0


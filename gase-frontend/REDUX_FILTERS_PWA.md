# Redux Toolkit для фильтров, PWA и адаптивность

## ✅ Реализованные функции

### 1. Redux Toolkit для управления фильтрами

#### Настройка Redux Store
- **Файл**: `src/store.ts`
- Redux DevTools включен для разработки (автоматически отключается в production)
- Store настроен с поддержкой всех необходимых middleware

#### Слайс для фильтров (`src/slices/gasSlice.ts`)
- **Интерфейс фильтров**: `GasFilters`
  - `search: string` - поиск по названию или формуле
  - `minMolarMass?: number` - минимальная молярная масса
  - `maxMolarMass?: number` - максимальная молярная масса

- **Actions (действия)**:
  - `setFilters(filters)` - установка всех фильтров
  - `setSearchFilter(search)` - установка только поискового фильтра
  - `clearFilters()` - сброс всех фильтров
  - `setGases(gases)` - установка списка газов
  - `setLoading(loading)` - установка состояния загрузки
  - `setError(error)` - установка ошибки

- **Селекторы (hooks)**:
  - `useFilteredGases()` - получить отфильтрованные газы
  - `useGasFilters()` - получить текущие фильтры
  - `useAllGases()` - получить все газы (без фильтров)
  - `useGasLoading()` - получить состояние загрузки
  - `useGasError()` - получить ошибку

#### Компонент фильтров (`src/components/GasFilters.tsx`)
- Синхронизирован с Redux store
- Автоматически применяет фильтры при изменении
- Кнопка "Очистить" для сброса фильтров

### 2. Redux DevTools

#### Установка расширения
1. Установите расширение Redux DevTools для браузера:
   - **Chrome**: [Redux DevTools Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
   - **Firefox**: [Redux DevTools Extension](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

2. После установки откройте DevTools (F12) и перейдите на вкладку "Redux"

#### Использование
- Просмотр состояния Redux store в реальном времени
- Отслеживание всех actions и изменений состояния
- Возможность "путешествия во времени" (time-travel debugging)
- Экспорт/импорт состояния для отладки

### 3. PWA (Progressive Web Application)

#### Настройка (`vite.config.ts`)
- **Плагин**: `vite-plugin-pwa`
- **Manifest**: настроен с иконками, цветами, ориентацией
- **Service Worker**: автоматически регистрируется через `registerSW`

#### Функции PWA
- ✅ Установка на домашний экран (desktop и mobile)
- ✅ Работа в оффлайн режиме
- ✅ Кеширование ресурсов (изображения, API запросы)
- ✅ Автоматическое обновление при наличии новой версии

#### Регистрация Service Worker (`src/main.tsx`)
- Автоматическая регистрация при загрузке приложения
- Обработка событий:
  - `onNeedRefresh` - новая версия доступна
  - `onOfflineReady` - приложение готово к работе оффлайн
  - `onRegistered` - успешная регистрация
  - `onRegisterError` - ошибка регистрации

#### HTTPS для локальной разработки
- Используется `vite-plugin-mkcert` для автоматической генерации сертификатов
- Сертификаты: `cert.key` и `cert.crt` (не коммитить в Git!)
- PWA работает только по HTTPS (или localhost)

### 4. Адаптивность

#### Реализована на всех трех страницах:

##### 1. HomePage (`src/pages/HomePage.css`)
- **Desktop**: полная карусель с навигацией
- **Tablet (≤768px)**: уменьшенные размеры карусели и кнопок
- **Mobile (≤480px)**: компактная карусель, меньшие шрифты

##### 2. GasesPage (`src/pages/GasesPage.css`)
- **Desktop**: сетка карточек с flexbox
- **Tablet (≤768px)**: 2 колонки, адаптивные отступы
- **Mobile (≤480px)**: 1 колонка, вертикальная компоновка

##### 3. GasDetailPage (`src/pages/GasDetailPage.css`)
- **Desktop**: полная информация в две колонки
- **Tablet (≤768px)**: одна колонка, уменьшенные изображения
- **Mobile (≤480px)**: компактная версия, минимальные отступы

#### Компоненты с адаптивностью:
- `Navbar` - бургер-меню на мобильных устройствах
- `GasCard` - адаптивные размеры карточек
- `GasFilters` - вертикальная компоновка на мобильных

### 5. GitHub Pages Deployment

#### Настройка (`vite.config.ts`)
- Автоматическое определение базового пути из переменных окружения
- `VITE_GITHUB_PAGES=true` - для GitHub Pages
- `VITE_REPO_NAME` - название репозитория

#### Скрипты (`package.json`)
- `build:gh-pages` - сборка для GitHub Pages
- `deploy` - автоматический деплой на GitHub Pages

#### Команды для деплоя:
```bash
npm run build:gh-pages
npm run deploy
```

#### Переменные окружения:
Создайте файл `.env`:
```
VITE_GITHUB_PAGES=true
VITE_REPO_NAME=gas-project-frontend
VITE_API_URL=http://localhost:8080
```

## 📋 Структура Redux Store

```typescript
{
  gas: {
    gases: Gas[],
    filteredGases: Gas[],
    loading: boolean,
    error: string | null,
    filters: {
      search: string,
      minMolarMass?: number,
      maxMolarMass?: number
    }
  },
  cart: {
    items: CartItem[],
    totalItems: number,
    totalAmount: number
  },
  gasCalculation: {
    Gases: Gas[],
    CalculationTotal: number
  }
}
```

## 🔧 Использование фильтров в компонентах

```typescript
import { useAppDispatch } from '../hooks/useTypedRedux';
import { setFilters, useGasFilters, clearFilters } from '../slices/gasSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const filters = useGasFilters();
  
  // Установка фильтров
  dispatch(setFilters({ 
    search: 'водород',
    minMolarMass: 2,
    maxMolarMass: 50
  }));
  
  // Сброс фильтров
  dispatch(clearFilters());
}
```

## 📱 Проверка PWA

1. **Локально (HTTPS)**:
   - Запустите `npm run dev`
   - Откройте DevTools → Application → Manifest
   - Проверьте, что нет ошибок

2. **На мобильном устройстве**:
   - Подключите устройство к той же сети
   - Откройте `https://<ваш-ip>:3000`
   - В меню браузера выберите "Добавить на главный экран"

3. **GitHub Pages**:
   - После деплоя откройте `https://<username>.github.io/<repo-name>`
   - Проверьте установку PWA

## 🎨 Адаптивные брейкпоинты

- **Desktop**: > 768px
- **Tablet**: 481px - 768px
- **Mobile**: ≤ 480px

## 📚 Дополнительные ресурсы

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [CSS Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)


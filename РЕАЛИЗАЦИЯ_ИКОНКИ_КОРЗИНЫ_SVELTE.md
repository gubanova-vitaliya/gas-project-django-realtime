# Реализация иконки корзины как микрофронтенд на Svelte

## Описание проекта

В данном проекте реализована иконка корзины (журнала давления сосуда) как микрофронтенд на Svelte, интегрированный в React-приложение. Компонент отображается в навигационной панели справа сверху, показывает количество газов в журнале и позволяет перейти на страницу журнала для просмотра черновика.

## Архитектура решения

### Концепция микрофронтенда

Микрофронтенд - это независимый компонент, который может быть разработан, развернут и обновлен отдельно от основного приложения. В данном случае:

- **Основное приложение**: React + TypeScript + Vite
- **Микрофронтенд**: Svelte компонент (CartIcon)
- **Интеграция**: Монтирование Svelte компонента в React через `new Component()` и `$destroy()`

### Преимущества такого подхода

1. **Независимость технологий**: Можно использовать разные фреймворки в одном приложении
2. **Изоляция**: Svelte компонент не влияет на React приложение и наоборот
3. **Переиспользование**: Компонент можно использовать в других приложениях
4. **Независимое обновление**: Можно обновлять Svelte компонент без пересборки всего приложения

## Установка зависимостей

### Необходимые пакеты

```bash
cd gase-frontend
npm install svelte@^4.2.0 @sveltejs/vite-plugin-svelte@^3.1.2 --save-dev --legacy-peer-deps
```

**Описание пакетов:**
- `svelte` - фреймворк Svelte версии 4 (совместим с Vite 5)
- `@sveltejs/vite-plugin-svelte` - плагин Vite для компиляции Svelte компонентов версии 3.x (совместим с Vite 5)

**Важно**: 
- Используется флаг `--legacy-peer-deps` для обхода конфликтов версий
- В данной реализации используется встроенная SVG иконка вместо библиотеки иконок, чтобы избежать конфликтов версий

## Настройка проекта

### 1. Конфигурация Vite (`vite.config.ts`)

Добавлен плагин Svelte в конфигурацию Vite:

```typescript
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    react(),
    svelte(),  // Добавлен плагин Svelte
    // ... другие плагины
  ],
  // ...
});
```

**Важно**: Плагин Svelte должен быть добавлен после плагина React, чтобы оба фреймворка работали корректно.

### 2. Конфигурация Svelte (`svelte.config.js`)

Создан файл конфигурации для Svelte:

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

Этот файл настраивает препроцессор для Svelte, который позволяет использовать TypeScript, PostCSS и другие инструменты.

## Структура файлов

```
gase-frontend/
├── src/
│   ├── components/
│   │   ├── CartIcon.svelte      # Svelte компонент иконки корзины
│   │   ├── CartIcon.css         # CSS файл (опционально, стили в компоненте)
│   │   └── Navbar.tsx           # React компонент навигации с интеграцией Svelte
│   └── ...
├── vite.config.ts               # Конфигурация Vite с плагином Svelte
├── svelte.config.js            # Конфигурация Svelte
└── package.json                 # Зависимости проекта
```

## Реализация Svelte компонента

### Файл: `src/components/CartIcon.svelte`

#### Импорты и типы

```svelte
<script lang="ts">
  import type { NavigateFunction } from "react-router-dom";
  import "./CartIcon.css";
  import { onMount, onDestroy } from "svelte";
  import { getDestApi } from "../../target_config";

  export let navigate: NavigateFunction;
```

**Объяснение:**
- `NavigateFunction` - тип функции навигации из React Router
- `export let navigate` - синтаксис Svelte 4 для получения пропсов
- `getDestApi()` - функция для получения базового URL API

**Примечание**: В Svelte 4 используется `export let`, в Svelte 5 используется `$props()`.

#### Состояние компонента

```svelte
  let draftId: number | null = null;
  let count: number = 0;
```

**Объяснение:**
- В Svelte 4 переменные автоматически реактивны при использовании в разметке
- `draftId` - ID черновика (заявки) в журнале
- `count` - количество газов в журнале

#### Функция загрузки данных

```svelte
  const loadCartData = async () => {
    const isAuthenticated = localStorage.getItem('auth_token') !== null;
    
    if (!isAuthenticated) {
      count = 0;
      draftId = null;
      return;
    }

    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!apiBase || !token) {
        count = 0;
        draftId = null;
        return;
      }

      const response = await fetch(`${apiBase}/api/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        count = 0;
        draftId = null;
        return;
      }

      const data = await response.json();
      count = data.count || 0;
      draftId = data.draft_id || null;
    } catch (error) {
      console.warn("Error loading cart data:", error);
      count = 0;
      draftId = null;
    }
  };
```

**Логика работы:**
1. Проверяет наличие токена авторизации
2. Получает базовый URL API
3. Выполняет GET-запрос к `/api/cart` с JWT токеном
4. Обновляет состояние `count` и `draftId` из ответа API
5. Обрабатывает ошибки, устанавливая значения по умолчанию

#### Инициализация и автообновление

```svelte
  let interval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    loadCartData();
    // Обновляем данные каждые 5 секунд
    interval = setInterval(loadCartData, 5000);
  });

  onDestroy(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
```

**Объяснение:**
- `onMount()` - хук Svelte, вызывается при монтировании компонента
- `onDestroy()` - хук Svelte, вызывается при размонтировании компонента
- Загружает данные сразу при монтировании
- Устанавливает интервал обновления каждые 5 секунд
- В `onDestroy()` очищается интервал для предотвращения утечек памяти

#### Обработчик клика

```svelte
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigate) {
      navigate('/journal');
    }
  };
```

**Логика:**
- Переходит на страницу журнала при клике
- Использует функцию `navigate` из React Router, переданную через пропсы
- Предотвращает всплытие события

#### Разметка компонента

```svelte
<button
  class="cart-icon"
  class:cart-icon_disabled={count === 0}
  onclick={handleClick}
  title={count > 0 ? `В журнале ${count} ${count === 1 ? 'газ' : count < 5 ? 'газа' : 'газов'}` : 'Журнал пуст'}
>
  <!-- Иконка давления в сосуде (сосуд с газом и манометром) -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="cart-icon__svg"
  >
    <!-- Сосуд (цилиндр) -->
    <rect x="6" y="6" width="8" height="14" rx="1.5" fill="none" stroke="currentColor"></rect>
    <!-- Горловина сосуда -->
    <rect x="7" y="4" width="6" height="2" rx="0.5" fill="none" stroke="currentColor"></rect>
    <!-- Клапан/крышка -->
    <circle cx="10" cy="5" r="0.8" fill="currentColor"></circle>
    <!-- Манометр (справа от сосуда) -->
    <circle cx="17" cy="10" r="3" fill="none" stroke="currentColor"></circle>
    <line x1="17" y1="10" x2="17" y2="7" stroke="currentColor"></line>
    <line x1="17" y1="10" x2="19.5" y2="11.5" stroke="currentColor"></line>
    <!-- Газы внутри сосуда (волны) -->
    <path d="M8 10 Q10 8, 12 10" stroke="currentColor" fill="none" stroke-width="1"></path>
    <path d="M8 14 Q10 12, 12 14" stroke="currentColor" fill="none" stroke-width="1"></path>
    <path d="M8 18 Q10 16, 12 18" stroke="currentColor" fill="none" stroke-width="1"></path>
  </svg>
  {#if count > 0}
    <span class="cart-icon__badge">{count}</span>
  {/if}
</button>
```

**Особенности:**
- Условный класс `cart-icon_disabled` применяется когда журнал пуст
- Динамический `title` с правильным склонением слова "газ"
- Условный рендеринг бейджа с количеством (`{#if}` - синтаксис Svelte)
- Иконка представляет собой сосуд с газом и манометром, что соответствует теме "давление в сосуде"

#### Стилизация

```svelte
<style>
  .cart-icon {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #4680C2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    font-size: 0.9rem;
    font-weight: 500;
    margin-left: 0.5rem;
    z-index: 1000;
  }

  .cart-icon:hover {
    background-color: #3a6cb0;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }

  .cart-icon:active {
    transform: translateY(0);
  }

  .cart-icon_disabled {
    opacity: 0.6;
    background-color: #6c757d;
    cursor: pointer;
  }
  
  .cart-icon_disabled:hover {
    background-color: #5a6268;
  }

  .cart-icon__badge {
    background: #ff3347;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cart-icon__svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
</style>
```

**Особенности стилей:**
- Относительное позиционирование для размещения в навигационной панели
- Hover-эффекты с изменением цвета и тени
- Анимация при нажатии
- Стили для неактивного состояния (но кнопка остается кликабельной)
- Стили для бейджа с количеством

## Интеграция в React

### Файл: `src/components/Navbar.tsx`

#### Импорты

```typescript
import { FC, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CartIcon from "./CartIcon.svelte";
```

**Объяснение:**
- `useLayoutEffect` - хук для синхронного выполнения перед отрисовкой
- `useRef` - хук для хранения ссылки на DOM элемент
- Импорт Svelte компонента как модуля

**Примечание**: В Svelte 4 не нужно импортировать `mount` и `unmount` - компоненты создаются через `new Component()` и уничтожаются через `$destroy()`.

#### Создание ref для контейнера

```typescript
export const AppNavbar: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cartIconRef = useRef<HTMLDivElement>(null);
  // ...
```

**Назначение:**
- `cartIconRef` - ссылка на DOM элемент, в который будет монтирован Svelte компонент

#### Монтирование Svelte компонента

```typescript
  // Монтируем Svelte компонент иконки корзины в Navbar
  useLayoutEffect(() => {
    if (cartIconRef.current && isAuthenticated) {
      // В Svelte 4 используем new Component() для создания экземпляра
      const cartIcon = new CartIcon({
        target: cartIconRef.current,
        props: { navigate },
      });
      return () => {
        // В Svelte 4 используем $destroy() для удаления компонента
        if (cartIcon && typeof cartIcon.$destroy === 'function') {
          cartIcon.$destroy();
        }
      };
    }
  }, [navigate, isAuthenticated]);
```

**Пошаговое объяснение:**

1. **`useLayoutEffect`** вместо `useEffect`:
   - Выполняется синхронно до отрисовки браузером
   - Гарантирует, что Svelte компонент будет монтирован до визуального отображения
   - Избегает "мигания" при загрузке

2. **Проверка `cartIconRef.current` и `isAuthenticated`**:
   - Убеждается, что DOM элемент существует
   - Монтирует компонент только для авторизованных пользователей
   - Предотвращает ошибки при монтировании

3. **`new CartIcon({...})`** (Svelte 4):
   - Создает экземпляр Svelte компонента
   - Монтирует компонент в указанный DOM элемент (`target`)
   - Передает пропсы через объект `props`
   - В Svelte 4 компоненты создаются через конструктор, а не через функцию `mount()`

4. **Функция очистки**:
   - Вызывается при размонтировании React компонента
   - `cartIcon.$destroy()` - правильно удаляет Svelte компонент в Svelte 4
   - Проверка `typeof cartIcon.$destroy === 'function'` гарантирует безопасность
   - Предотвращает утечки памяти

5. **Зависимости `[navigate, isAuthenticated]`**:
   - Перемонтирует компонент при изменении функции навигации или статуса авторизации
   - Обычно `navigate` стабильна, но лучше перестраховаться

#### Разметка с контейнером

```typescript
  return (
    <Navbar expand="lg" bg="dark" variant="dark" sticky="top" className="app-navbar">
      <Container fluid>
        {/* ... */}
        <Navbar.Collapse id="main-navbar">
          {/* ... */}
          <Nav className="ms-auto align-items-center">
            {isAuthenticated && (
              <>
                <div ref={cartIconRef} className="cart-icon-container"></div>
                <NavDropdown title={username || 'Пользователь'} id="user-dropdown" className="me-2">
                  {/* ... */}
                </NavDropdown>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
```

**Важно:**
- Пустой `div` с классом `cart-icon-container` служит контейнером для Svelte компонента
- `ref={cartIconRef}` связывает DOM элемент с переменной
- Svelte компонент монтируется внутрь этого элемента
- Размещен справа в навигационной панели (`ms-auto`)

## API взаимодействие

### Эндпоинт: `GET /api/cart`

**Запрос:**
```http
GET /api/cart
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Ответ (успех):**
```json
{
  "draft_id": 123,
  "count": 5
}
```

**Ответ (пустая корзина):**
```json
{
  "draft_id": null,
  "count": 0
}
```

**Обработка ошибок:**
- Если запрос не удался, компонент устанавливает `count = 0` и `draftId = null`
- Компонент остается кликабельным, но показывает, что журнал пуст

## Жизненный цикл компонента

### 1. Монтирование React компонента (Navbar)
   - Создается `ref` для контейнера
   - Вызывается `useLayoutEffect`

### 2. Монтирование Svelte компонента (CartIcon)
   - Вызывается `new CartIcon({...})`
   - Svelte компонент создается и вставляется в DOM
   - Вызывается `onMount()` в Svelte
   - Загружаются данные журнала через API
   - Устанавливается интервал обновления (5 секунд)

### 3. Работа компонента
   - Каждые 5 секунд обновляются данные журнала
   - При изменении `count` или `draftId` обновляется UI
   - При клике выполняется переход на `/journal`

### 4. Размонтирование
   - При размонтировании React компонента вызывается функция очистки
   - Вызывается `cartIcon.$destroy()`
   - Удаляется интервал обновления
   - Svelte компонент удаляется из DOM

## Особенности реализации

### 1. Реактивность Svelte

Svelte использует компиляцию для создания реактивного кода. При изменении `count` или `draftId`:

```svelte
count = 5;  // Автоматически обновляется UI
```

Компилятор Svelte автоматически генерирует код для обновления DOM.

### 2. Передача функций из React в Svelte

Функция `navigate` из React Router передается как проп:

```typescript
new CartIcon({
  target: cartIconRef.current,
  props: { navigate },
});
```

В Svelte она используется напрямую:

```svelte
export let navigate: NavigateFunction;
// ...
navigate('/journal');
```

### 3. Доступ к глобальным функциям

Svelte компонент использует `getDestApi()` из общего модуля:

```svelte
import { getDestApi } from "../../target_config";
```

Это позволяет использовать общую конфигурацию между React и Svelte.

### 4. Работа с localStorage

Svelte компонент напрямую обращается к `localStorage`:

```svelte
const token = localStorage.getItem('auth_token');
```

Это работает, так как `localStorage` - это глобальный API браузера, доступный из любого контекста.

### 5. Иконка "давление в сосуде"

Иконка представляет собой SVG изображение сосуда с газом и манометром:
- Сосуд (цилиндр) с горловиной и клапаном
- Манометр справа от сосуда (круг с стрелкой)
- Газы внутри сосуда (волны)

Это визуально отражает тему приложения - расчет давления газов в сосуде.

## Тестирование

### Проверка работы компонента

1. **Запуск приложения:**
   ```bash
   cd gase-frontend
   npm run dev
   ```

2. **Переход на страницу:**
   - Откройте `https://localhost:3000`
   - В правом верхнем углу навигационной панели должна появиться иконка сосуда

3. **Проверка без авторизации:**
   - Выйдите из системы
   - Иконка не должна отображаться (монтируется только для авторизованных)

4. **Проверка с авторизацией:**
   - Войдите в систему
   - Добавьте газы в журнал
   - Иконка должна показать количество газов
   - При клике должен произойти переход на `/journal`

5. **Проверка автообновления:**
   - Откройте консоль браузера
   - Добавьте газ в журнал из другого окна/вкладки
   - Через 5 секунд иконка должна обновиться

## Возможные проблемы и решения

### Проблема 1: Компонент не отображается

**Причины:**
- Не установлены зависимости
- Не настроен Vite плагин
- Ошибка при монтировании

**Решение:**
```bash
npm install svelte@^4.2.0 @sveltejs/vite-plugin-svelte@^3.1.2 --save-dev --legacy-peer-deps
```
Проверьте конфигурацию Vite и наличие `svelte.config.js`.

### Проблема 2: Ошибка при импорте Svelte компонента

**Причина:**
- TypeScript не знает о `.svelte` файлах

**Решение:**
Добавьте в `vite-env.d.ts` или создайте `svelte.d.ts`:
```typescript
declare module '*.svelte' {
  import { ComponentType } from 'svelte';
  const component: ComponentType;
  export default component;
}
```

### Проблема 3: Компонент не обновляется

**Причина:**
- Интервал не установлен
- API не возвращает данные

**Решение:**
- Проверьте консоль браузера на ошибки
- Убедитесь, что бэкенд запущен
- Проверьте токен авторизации

### Проблема 4: Переход на /journal не работает

**Причина:**
- Функция `navigate` не передана или не работает

**Решение:**
- Проверьте, что `navigate` передается через пропсы
- Убедитесь, что маршрут `/journal` существует в роутере
- Проверьте консоль браузера на ошибки

### Проблема 5: Ошибка "Unrecognized option 'hmr'"

**Причина:**
- Несовместимость версий плагина Svelte

**Решение:**
- Используйте `@sveltejs/vite-plugin-svelte@^3.1.2` для Vite 5
- Упростите конфигурацию плагина в `vite.config.ts`

## Расширение функциональности

### Добавление уведомлений

Можно добавить уведомления при изменении количества:

```svelte
import { onMount } from 'svelte';

let prevCount = 0;

onMount(() => {
  // ...
  $effect(() => {
    if (count > prevCount) {
      // Показать уведомление о добавлении
    }
    prevCount = count;
  });
});
```

### Добавление анимации

Можно добавить анимацию при изменении количества:

```svelte
<script>
  import { fly } from 'svelte/transition';
</script>

{#if count > 0}
  <span 
    class="cart-icon__badge"
    transition:fly={{ y: -10, duration: 300 }}
  >
    {count}
  </span>
{/if}
```

### Добавление звукового сигнала

```svelte
const handleClick = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (navigate) {
    // Воспроизвести звук
    const audio = new Audio('/sounds/cart-click.mp3');
    audio.play();
    navigate('/journal');
  }
};
```

## Заключение

Реализация иконки корзины как микрофронтенд на Svelte демонстрирует:

1. **Гибкость архитектуры**: Возможность использования разных фреймворков в одном приложении
2. **Изоляцию компонентов**: Svelte компонент работает независимо от React
3. **Производительность**: Svelte компилируется в оптимизированный код
4. **Удобство разработки**: Простой синтаксис Svelte для реактивности
5. **Визуальную согласованность**: Иконка отражает тему приложения - давление газов в сосуде

Такой подход позволяет постепенно мигрировать на новые технологии или использовать лучшие инструменты для конкретных задач, не переписывая всё приложение.

## Полезные ссылки

- [Документация Svelte](https://svelte.dev/docs)
- [Svelte 4](https://svelte.dev/docs/svelte-compiler)
- [Vite Plugin Svelte](https://github.com/sveltejs/vite-plugin-svelte)
- [Интеграция Svelte с React](https://svelte.dev/docs/svelte-package)


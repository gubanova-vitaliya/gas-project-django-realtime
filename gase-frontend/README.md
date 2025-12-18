<<<<<<< HEAD
# Gase Frontend
=======
# Gas Project Frontend
>>>>>>> origin/react-frontend

React приложение для работы с газами и расчетами.

## Разработка

```bash
npm install
npm run dev
```

## Развертывание на GitHub Pages

### Важные аспекты для успешного деплоя

✅ **Роутинг настроен правильно:**
- `BrowserRouter` с `basename` настроен в `main.tsx`
- Все навигационные ссылки используют компонент `Link` из `react-router-dom`
- Все пути учитывают base path автоматически

✅ **Конфигурация Vite:**
- `vite.config.ts` настроен для работы с GitHub Pages
- Base path устанавливается автоматически через переменные окружения

✅ **Нет ошибок и предупреждений:**
- Проект проверен линтером
- Все компоненты корректно настроены

### Настройка

1. Убедитесь, что `gh-pages` установлен:
```bash
npm install
```

2. Перед сборкой для GitHub Pages установите переменные окружения:
   - `VITE_GITHUB_PAGES=true` - включает режим GitHub Pages
   - `VITE_REPO_NAME` - имя вашего репозитория (по умолчанию: `gas-project-frontend`)
     - Если репозиторий называется `username.github.io`, установите пустую строку: `VITE_REPO_NAME=""`

### Сборка и деплой

#### Вариант 1: Использование скрипта deploy (рекомендуется)

```bash
# Windows (PowerShell)
$env:VITE_GITHUB_PAGES="true"; $env:VITE_REPO_NAME="gas-project-frontend"; npm run deploy

# Windows (CMD)
set VITE_GITHUB_PAGES=true && set VITE_REPO_NAME=gas-project-frontend && npm run deploy

# Linux/Mac
VITE_GITHUB_PAGES=true VITE_REPO_NAME=gas-project-frontend npm run deploy
```

#### Вариант 2: Ручная сборка и деплой

```bash
# 1. Сборка с переменными окружения
# Windows (PowerShell)
$env:VITE_GITHUB_PAGES="true"; $env:VITE_REPO_NAME="gas-project-frontend"; npm run build:gh-pages

# Linux/Mac
VITE_GITHUB_PAGES=true VITE_REPO_NAME=gas-project-frontend npm run build:gh-pages

# 2. Деплой
npm run deploy
```

### Настройка в GitHub

1. Перейдите в Settings → Pages вашего репозитория
2. Выберите источник: `gh-pages` branch
3. Сохраните настройки

После деплоя приложение будет доступно по адресу:
- `https://username.github.io/gas-project-frontend/` (если указано имя репозитория)
- `https://username.github.io/` (если репозиторий называется `username.github.io`)

### Важные замечания

- ⚠️ **Имя репозитория:** Убедитесь, что `VITE_REPO_NAME` совпадает с реальным именем репозитория на GitHub
- ⚠️ **AJAX запросы:** При развертывании на GitHub Pages, AJAX запросы будут идти по http, в то время как приложение доступно по https. Работать это будет только при использовании адреса `localhost` в AJAX запросах или при настройке CORS на бекенде
- ⚠️ **Бекенд API:** Бекенд API не будет работать на GitHub Pages (только статический фронтенд)
- ✅ **Mock данные:** В режиме GitHub Pages приложение автоматически использует mock данные при недоступности API
- ✅ **Роутинг:** Все ссылки используют `Link` компонент, который автоматически учитывает `basename`

## Progressive Web Application (PWA)

Приложение настроено как PWA и может быть установлено на устройство.

### Требования для PWA:

1. **Создайте PNG иконки** (см. `PWA_SETUP.md`):
   - `public/logo192.png` (192x192 пикселей)
   - `public/logo512.png` (512x512 пикселей)

2. **Проверка PWA**:
   - Откройте DevTools → Application → Manifest
   - Убедитесь, что нет ошибок
   - Проверьте Service Worker во вкладке Service Workers

3. **Установка**:
   - В браузере появится иконка установки приложения
   - На Android: меню → "Добавить на главный экран"
   - На iOS: кнопка "Поделиться" → "На экран «Домой»"

### Особенности PWA:

- ✅ Работа в оффлайн режиме (после первой загрузки)
- ✅ Кеширование изображений и API запросов
- ✅ Автоматическое обновление Service Worker
- ✅ Иконка приложения на рабочем столе
- ✅ Запуск в полноэкранном режиме (standalone)

Подробнее см. `PWA_SETUP.md`

## Настройка HTTPS для локальной разработки

Для работы PWA на мобильных устройствах необходимо использовать HTTPS. 

### Быстрый старт:

1. **Установите mkcert:**
   ```bash
   npm install -g mkcert
   ```

2. **Создайте сертификаты:**
   ```bash
   cd gase-frontend
   mkcert create-ca
   mkcert create-cert
   ```

3. **Запустите приложение:**
   ```bash
   npm run dev
   ```

Приложение будет доступно по `https://localhost:3000` и по IP-адресу вашего компьютера для доступа с мобильных устройств.

⚠️ **Важно:** Приватные ключи (`.key` файлы) уже добавлены в `.gitignore` и не должны попадать в репозиторий!

Подробная инструкция: `HTTPS_SETUP.md`

## Адаптивный дизайн

Приложение полностью адаптировано для работы на всех устройствах:

- ✅ **Desktop** (> 768px): Полная функциональность, оптимальная компоновка
- ✅ **Tablet** (≤ 768px): Адаптированная навигация, 2 карточки в ряд
- ✅ **Mobile** (≤ 480px): Бургер-меню, вертикальная компоновка карточек

### Особенности:

- **Flexbox layout** для гибкой компоновки карточек
- **Адаптивная навигация** с бургер-меню на мобильных
- **Оптимизированные изображения** для разных размеров экрана
- **Touch-friendly** интерфейс для мобильных устройств

Подробнее см. `RESPONSIVE_DESIGN.md`


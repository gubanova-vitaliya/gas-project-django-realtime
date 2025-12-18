# Настройка PWA (Progressive Web Application)

## Создание иконок для PWA

Для работы PWA необходимы PNG иконки следующих размеров:
- `logo192.png` - 192x192 пикселей
- `logo512.png` - 512x512 пикселей

### Способы создания иконок:

1. **Автоматическая генерация (рекомендуется)**:
   ```bash
   # Установите sharp (если еще не установлен)
   npm install -D sharp
   
   # Запустите скрипт генерации
   npm run generate-icons
   ```
   Скрипт автоматически создаст `logo192.png` и `logo512.png` из `DefaultImage.svg`

2. **Используя существующий SVG в графическом редакторе**:
   - Откройте `public/DefaultImage.svg` в графическом редакторе (Inkscape, Adobe Illustrator, Figma)
   - Экспортируйте как PNG с размерами 192x192 и 512x512
   - Сохраните в папку `public/` как `logo192.png` и `logo512.png`

3. **Онлайн-конвертеры**:
   - Используйте [CloudConvert](https://cloudconvert.com/svg-to-png) или [Convertio](https://convertio.co/svg-png/)
   - Загрузите `DefaultImage.svg`
   - Установите размеры 192x192 и 512x512
   - Скачайте и поместите в `public/`

4. **Используя ImageMagick** (если установлен):
   ```bash
   # Для Windows (если установлен ImageMagick)
   magick convert -background none -resize 192x192 public/DefaultImage.svg public/logo192.png
   magick convert -background none -resize 512x512 public/DefaultImage.svg public/logo512.png
   ```

## Проверка PWA

### В браузере (Chrome/Edge):

1. Откройте DevTools (F12 или Ctrl+Shift+I)
2. Перейдите во вкладку **Application**
3. Проверьте:
   - **Manifest** - должен быть без ошибок
   - **Service Workers** - должен быть зарегистрирован и активен
4. В адресной строке должна появиться иконка установки приложения

### Установка на устройство:

#### Android:
1. Откройте приложение в браузере Chrome на Android
2. В меню браузера выберите "Добавить на главный экран"
3. Иконка появится на рабочем столе

#### iOS (Safari):
1. Откройте приложение в Safari
2. Нажмите кнопку "Поделиться"
3. Выберите "На экран «Домой»"

## Работа в оффлайн режиме

После установки PWA:
1. Включите авиарежим на устройстве
2. Откройте приложение
3. Приложение должно работать, используя кешированные данные

## Важные замечания

⚠️ **HTTPS обязателен**: PWA работает только по HTTPS (или localhost для разработки)
- На GitHub Pages это работает автоматически
- Для локальной разработки необходимо настроить HTTPS сертификаты
- **Подробная инструкция:** см. `HTTPS_SETUP.md`

⚠️ **Service Worker**: Если возникают проблемы:
1. Откройте DevTools → Application → Service Workers
2. Нажмите "Unregister" для старого Service Worker
3. Перезагрузите страницу

⚠️ **Обновления**: При обновлении приложения Service Worker автоматически обновит кеш благодаря `registerType: 'autoUpdate'`

## Текущая конфигурация

- ✅ Manifest настроен с правильным `start_url` для GitHub Pages
- ✅ Service Worker зарегистрирован с обработкой ошибок
- ✅ Кеширование настроено для изображений и API запросов
- ✅ PWA работает в режиме разработки (`devOptions.enabled: true`)


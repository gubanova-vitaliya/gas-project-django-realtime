// Конфигурация для разных окружений (development, production, GitHub Pages)

// Определяем окружение
const isDevelopment = import.meta.env.DEV;

// Имя репозитория для GitHub Pages (можно переопределить через переменную окружения)
// Если репозиторий называется username.github.io, то используйте пустую строку
const REPO_NAME = import.meta.env.VITE_REPO_NAME || 'gas-project-frontend';

// Base path для GitHub Pages
const GITHUB_PAGES_BASE = REPO_NAME ? `/${REPO_NAME}/` : '/';

// Base path для разных окружений
// В development используем пустую строку
// В production всегда используем путь репозитория (для GitHub Pages)
// Можно переопределить через VITE_GITHUB_PAGES=false для локального production
const forceLocalProduction = import.meta.env.VITE_GITHUB_PAGES === 'false';
export const dest_root = isDevelopment ? '' : (forceLocalProduction ? '/' : GITHUB_PAGES_BASE);

// API адреса
// Приоритет получения URL бэкенда:
// 1. window.__API_URL__ (можно установить через скрипт в HTML)
// 2. meta tag с name="api-url" (можно редактировать в index.html после сборки)
// 3. VITE_API_URL (переменная окружения при сборке)
// 4. localhost для development, пустая строка для production

const getApiUrlFromMeta = (): string | null => {
  if (typeof document === 'undefined') return null;
  const metaTag = document.querySelector('meta[name="api-url"]');
  if (metaTag) {
    const content = metaTag.getAttribute('content');
    if (content && content !== 'YOUR_BACKEND_URL' && content.trim() !== '') {
      return content.trim();
    }
  }
  return null;
};

const getApiUrlFromWindow = (): string | null => {
  if (typeof window !== 'undefined' && (window as any).__API_URL__) {
    const url = (window as any).__API_URL__;
    if (url && url.trim() !== '') {
      return url.trim();
    }
  }
  return null;
};

const defaultApiUrl = isDevelopment ? 'http://localhost:8080' : '';
const envApiUrl = import.meta.env.VITE_API_URL;

// Получаем URL в порядке приоритета
const windowApiUrl = getApiUrlFromWindow();
const metaApiUrl = getApiUrlFromMeta();
export const api_proxy_addr = windowApiUrl || metaApiUrl || envApiUrl || defaultApiUrl;

// Логирование для отладки (только в браузере)
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    isDevelopment,
    sources: {
      window: windowApiUrl,
      meta: metaApiUrl,
      env: envApiUrl,
      default: defaultApiUrl
    },
    finalApiUrl: api_proxy_addr,
    mode: import.meta.env.MODE,
    allEnv: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
  
  // Показываем предупреждение, если API URL не настроен в production
  if (!isDevelopment && (!api_proxy_addr || api_proxy_addr === '')) {
    console.warn('⚠️ API URL не настроен! Данные будут загружаться из mock.');
    console.warn('💡 Чтобы подключить бэкенд:');
    console.warn('   1. Отредактируйте index.html и замените YOUR_BACKEND_URL в <meta name="api-url">');
    console.warn('   2. Или установите window.__API_URL__ = "https://your-backend.com" в консоли');
    console.warn('   3. Или пересоберите с VITE_API_URL=https://your-backend.com');
  }
}

export const notes_api_addr = import.meta.env.VITE_NOTES_API_URL || (isDevelopment ? 'http://localhost:8081' : '');
export const img_proxy_addr = import.meta.env.VITE_IMG_PROXY_URL || import.meta.env.VITE_API_URL || defaultApiUrl;

// Функции для получения конфигурации (для обратной совместимости)
export function getDestRoot(): string {
  return dest_root;
}

export function getDestApi(): string {
  return api_proxy_addr;
}

export function getDestImg(): string {
  return img_proxy_addr;
}


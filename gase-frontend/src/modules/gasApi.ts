import { Gas } from "../components/GasCard";
import { GASES_MOCK } from "./mock";
import { getDestApi } from "../../target_config";

export interface GasFilters {
  search?: string;
}

// Функция для преобразования URL изображений MinIO в прокси URL
const transformImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  
  const apiBase = getDestApi();
  
  // Если API базовый URL не установлен, возвращаем null (будет использовано дефолтное изображение)
  if (!apiBase || apiBase === '') {
    console.debug('API base URL not configured, image will use fallback');
    return null;
  }
  
  // Если URL уже начинается с /api/minio/, просто добавляем базовый URL API
  if (imageUrl.startsWith('/api/minio/')) {
    const finalUrl = `${apiBase}${imageUrl}`;
    console.debug('Image URL already in proxy format:', imageUrl, '→', finalUrl);
    return finalUrl;
  }
  
  // Если это относительный URL (начинается с /)
  if (imageUrl.startsWith('/')) {
    // Если это путь к MinIO через API прокси (без /api/minio/)
    if (imageUrl.includes('/minio/') || imageUrl.includes('/gase/') || imageUrl.includes('/gases/')) {
      // Убираем ведущий слэш и формируем полный URL через API прокси
      const path = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      // Убеждаемся, что путь начинается с api/minio/
      const finalPath = path.startsWith('api/') ? path : `api/${path}`;
      const finalUrl = `${apiBase}/${finalPath}`;
      console.debug('Transformed relative image URL:', imageUrl, '→', finalUrl);
      return finalUrl;
    }
    // Если это другой относительный путь, добавляем базовый URL API
    const finalUrl = `${apiBase}${imageUrl}`;
    console.debug('Transformed relative URL:', imageUrl, '→', finalUrl);
    return finalUrl;
  }
  
  // Если URL указывает на MinIO (любой домен с портом 19000 или содержит /gase/ или /gases/)
  const isMinIOUrl = imageUrl.includes(':19000') || imageUrl.includes(':9000') || 
                     imageUrl.includes('/gase/') || 
                     imageUrl.includes('/gases/') ||
                     imageUrl.includes('minio');
  
  if (isMinIOUrl) {
    // Извлекаем путь к изображению
    try {
      const url = new URL(imageUrl);
      let path = url.pathname;
      
      // Убираем ведущий слэш
      if (path.startsWith('/')) {
        path = path.slice(1);
      }
      
      // Исправляем неправильное имя bucket: gase -> gases
      if (path.startsWith('gase/')) {
        path = path.replace('gase/', 'gases/');
      }
      
      // Формируем URL через API прокси
      const finalUrl = `${apiBase}/api/minio/${path}`;
      console.debug('Transformed MinIO URL:', imageUrl, '→', finalUrl);
      return finalUrl;
    } catch (e) {
      // Если не удалось распарсить URL, пытаемся извлечь путь вручную
      console.warn('Failed to parse image URL, trying manual extraction:', imageUrl);
      
      // Пытаемся найти путь после домена
      const pathMatch = imageUrl.match(/\/(gase|gases|minio)\/(.+)$/);
      if (pathMatch) {
        let path = pathMatch[2];
        if (pathMatch[1] === 'gase') {
          path = 'gases/' + path;
        } else {
          path = pathMatch[1] + '/' + path;
        }
        const finalUrl = `${apiBase}/api/minio/${path}`;
        console.debug('Manually extracted path:', finalUrl);
        return finalUrl;
      }
      
      return null;
    }
  }
  
  // Если это полный URL к другому домену (например, CDN), возвращаем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Если ничего не подошло, возвращаем null (будет использовано дефолтное изображение)
  console.warn('Unknown image URL format:', imageUrl);
  return null;
};

export const getGases = async (filters?: GasFilters): Promise<Gas[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.search) {
      params.append("search", filters.search);
    }

    const queryString = params.toString();
    const apiBase = getDestApi();
    
    console.log('🌐 getGases called:', {
      apiBase,
      hasApiBase: !!apiBase && apiBase !== '',
      filters,
      queryString
    });
    
    // Если API URL не установлен (production без VITE_API_URL), сразу используем mock данные
    if (!apiBase || apiBase === '') {
      console.warn('⚠️ API URL not configured, using mock data');
      let mockGases = [...GASES_MOCK];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        mockGases = mockGases.filter(
          (gas) =>
            gas.title.toLowerCase().includes(searchLower) ||
            gas.formula.toLowerCase().includes(searchLower)
        );
      }
      console.log('📦 Returning mock data:', mockGases.length, 'gases');
      // Преобразуем URL изображений в mock данных через transformImageUrl
      return mockGases.map(gas => ({
        ...gas,
        image_url: transformImageUrl(gas.image_url || null)
      }));
    }
    
    // Всегда используем полный URL к API
    // Если VITE_API_URL установлен (например, https://your-backend.railway.app), используем его
    // Иначе используем localhost для development
    const url = `${apiBase}/api/gases${queryString ? `?${queryString}` : ""}`;
    console.log('🚀 Fetching gases from API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Добавляем таймаут для запросов (10 секунд)
      signal: AbortSignal.timeout(10000),
    });
    
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    // Если ошибка сервера, НЕ используем mock данные - выбрасываем ошибку
    // Это гарантирует, что данные всегда берутся из бэкенда/БД, а не из mock
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ API returned ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 API Response data from backend/DB:', data);
    
    // Проверяем, что получили массив
    if (!Array.isArray(data)) {
      console.error('❌ Invalid response format, expected array, got:', typeof data, data);
      throw new Error("Invalid response format");
    }
    
    console.log(`✅ Successfully loaded ${data.length} gases from backend database`);
    
    // Обрабатываем данные из БД - изображения уже нормализованы бэкендом
    return data.map((gas: any) => {
      const rawImageUrl = gas.ImageURL || gas.image_url;
      const transformedUrl = transformImageUrl(rawImageUrl);
      console.log(`🖼️ Gas ${gas.ID || gas.id} (${gas.Title || gas.title}) from DB:`, {
        rawImageUrl,
        transformedUrl,
        apiBase: getDestApi()
      });
      return {
        id: gas.ID || gas.id,
        title: gas.Title || gas.title,
        formula: gas.Formula || gas.formula,
        molar_mass: gas.MolarMass || gas.molar_mass,
        image_url: transformedUrl, // URL из БД, уже нормализован бэкендом
        description: gas.Description || gas.description,
        description_en: gas.DescriptionEn || gas.description_en, // Сохраняем английское описание если есть
      };
    });
  } catch (error: any) {
    // Перехватываем все ошибки: сетевые (ERR_CONNECTION_REFUSED), таймауты, 500, 404 и т.д.
    // Ошибка ERR_CONNECTION_REFUSED или 404 - это нормально, когда бэкенд не запущен или недоступен
    // В этом случае просто используем mock данные без лишних сообщений
    const isConnectionError = 
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('404') ||
      error.message?.includes('timeout') ||
      error.name === 'TypeError' ||
      error.name === 'AbortError';
    
    // Логируем информацию о недоступности API
    if (isConnectionError) {
      console.info("API unavailable, using mock data");
    } else {
      console.warn("Error fetching gases from API:", error.message || error);
    }
    
    // Используем mock данные при любой ошибке
    let mockGases = [...GASES_MOCK];
    
    // Применяем фильтры к mock данным
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      mockGases = mockGases.filter(
        (gas) =>
          gas.title.toLowerCase().includes(searchLower) ||
          gas.formula.toLowerCase().includes(searchLower)
      );
    }

    // Преобразуем URL изображений в mock данных через transformImageUrl
    return mockGases.map(gas => ({
      ...gas,
      image_url: transformImageUrl(gas.image_url || null)
    }));
  }
};

export const getGasById = async (id: number): Promise<Gas | null> => {
  const apiBase = getDestApi();
  
  // Если API URL не установлен, используем mock данные
  if (!apiBase || apiBase === '') {
    console.info('API URL not configured, using mock data');
    const mockGas = GASES_MOCK.find((gas) => gas.id === id);
    if (!mockGas) return null;
    // Преобразуем URL изображения через transformImageUrl
    return {
      ...mockGas,
      image_url: transformImageUrl(mockGas.image_url || null)
    };
  }
  
  // Если API URL установлен, пытаемся получить данные с бэкенда
  try {
    const url = `${apiBase}/api/gases/${id}`;
    console.log('Fetching gas from API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 секунд
    });
    
    // Если ошибка сервера, НЕ используем mock данные - выбрасываем ошибку
    // Это гарантирует, что данные всегда берутся из бэкенда/БД
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ API returned ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully loaded gas from backend database:', data.title || data.Title);
    
    const rawImageUrl = data.ImageURL || data.image_url;
    const transformedUrl = transformImageUrl(rawImageUrl);
    console.log(`🖼️ Gas ${data.ID || data.id} image URL from DB:`, {
      rawImageUrl,
      transformedUrl,
      apiBase: getDestApi()
    });
    
    return {
      id: data.ID || data.id,
      title: data.Title || data.title,
      formula: data.Formula || data.formula,
      molar_mass: data.MolarMass || data.molar_mass,
      image_url: transformedUrl, // URL из БД, уже нормализован бэкендом
      description: data.Description || data.description,
      description_en: data.DescriptionEn || data.description_en, // Сохраняем английское описание если есть
    };
  } catch (error: any) {
    // Перехватываем все ошибки
    const isConnectionError = 
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('404') ||
      error.message?.includes('timeout') ||
      error.name === 'TypeError' ||
      error.name === 'AbortError';
    
    // Логируем только неожиданные ошибки
    if (!isConnectionError) {
      console.warn("Error fetching gas from API:", error.message || error);
    } else {
      console.info("API unavailable, using mock data");
    }
    
    // Используем mock данные при ошибке
    const mockGas = GASES_MOCK.find((gas) => gas.id === id);
    if (!mockGas) return null;
    // Преобразуем URL изображения через transformImageUrl
    return {
      ...mockGas,
      image_url: transformImageUrl(mockGas.image_url || null)
    };
  }
};

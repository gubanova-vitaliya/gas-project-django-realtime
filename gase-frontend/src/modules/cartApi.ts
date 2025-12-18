import { getDestApi } from "../../target_config";

export const getCartCount = async (): Promise<number> => {
  try {
    const apiBase = getDestApi();
    
    // Если API URL не установлен, возвращаем 0
    if (!apiBase || apiBase === '') {
      console.debug('API URL not configured, cart count will be 0');
      return 0;
    }
    
    // Используем полный URL к API
    const url = `${apiBase}/api/cart`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Если ошибка сервера, возвращаем 0
    if (!response.ok) {
      console.warn(`Cart API returned ${response.status}, using default count 0`);
      return 0;
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.warn("Error fetching cart count, using default count 0:", error);
    // Возвращаем 0 при ошибке
    return 0;
  }
};

export const addGasToCart = async (gasId: number): Promise<void> => {
  // Метод существует, но реализация добавления в журнал будет добавлена позже
  console.log(`Метод addGasToCart вызван для газа с ID: ${gasId}`);
  // TODO: Реализовать добавление газа в журнал расчетов
};

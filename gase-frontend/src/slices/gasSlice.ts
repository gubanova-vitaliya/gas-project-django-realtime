import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { useAppSelector } from "../hooks/useTypedRedux";
import { Gas } from "../components/GasCard";
import { getGases } from "../modules/gasApi";
import { GASES_MOCK } from "../modules/mock";

// Интерфейс для фильтров
export interface GasFilters {
  minMolarMass?: number;
  maxMolarMass?: number;
  search?: string;
}

interface GasState {
  gases: Gas[];
  filteredGases: Gas[];
  loading: boolean;
  error: string | null;
  filters: GasFilters;
  searchValue: string;
}

const initialState: GasState = {
  gases: [],
  filteredGases: [],
  loading: false,
  error: null,
  filters: {
    minMolarMass: undefined,
    maxMolarMass: undefined,
    search: undefined,
  },
  searchValue: '',
};

// Асинхронное действие для загрузки списка газов
export const getGasesList = createAsyncThunk(
  'gas/getGasesList',
  async (_, { getState,  rejectWithValue }) => {
    try {
      const state = getState() as any;
      const searchValue = state.gas?.searchValue || '';
      
      const gases = await getGases({ search: searchValue || undefined });
      
      // Получаем данные корзины из ответа API (если есть)
      // Предполагаем, что в будущем API будет возвращать эти данные
      // Пока что используем данные из cart slice
      
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

const gasSlice = createSlice({
  name: "gas",
  initialState,
  reducers: {
    setSearchValue(state, action: PayloadAction<string>) {
      state.searchValue = action.payload;
      state.filters.search = action.payload || undefined;
      applyFilters(state);
    },
    setGases(state, action: PayloadAction<Gas[]>) {
      state.gases = action.payload;
      // Применяем текущие фильтры к новым данным
      applyFilters(state);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    // Установка всех фильтров
    setFilters(state, action: PayloadAction<Partial<GasFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      if (action.payload.search !== undefined) {
        state.searchValue = action.payload.search || '';
      }
      // Применяем фильтры
      applyFilters(state);
    },
    // Сброс всех фильтров
    clearFilters(state) {
      state.filters = {
        minMolarMass: undefined,
        maxMolarMass: undefined,
        search: undefined,
      };
      state.searchValue = '';
      state.filteredGases = state.gases;
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
        // Если это mock данные, используем их
        if (Array.isArray(action.payload)) {
          state.gases = action.payload;
          applyFilters(state);
        } else {
          state.error = 'Ошибка при загрузке данных';
        }
      });
  },
});

// Вспомогательная функция для применения фильтров
function applyFilters(state: GasState) {
  const { minMolarMass, maxMolarMass, search } = state.filters;
  
  // Фильтруем газы по молярной массе и поиску
  let filtered = state.gases.filter((gas) => {
    // Фильтр по поиску
    const matchesSearch = !search || !search.trim() || 
      gas.title.toLowerCase().includes(search.toLowerCase()) ||
      gas.formula.toLowerCase().includes(search.toLowerCase());
    
    // Фильтр по молярной массе с валидацией
    const matchesMinMass = minMolarMass === undefined || isNaN(minMolarMass) || gas.molar_mass >= minMolarMass;
    const matchesMaxMass = maxMolarMass === undefined || isNaN(maxMolarMass) || gas.molar_mass <= maxMolarMass;
    
    // Проверяем, что min не больше max (если оба заданы)
    const isValidRange = 
      minMolarMass === undefined || 
      maxMolarMass === undefined || 
      isNaN(minMolarMass) || 
      isNaN(maxMolarMass) || 
      minMolarMass <= maxMolarMass;
    
    return matchesSearch && matchesMinMass && matchesMaxMass && isValidRange;
  });
  
  // Сортируем отфильтрованные газы по молярной массе (по возрастанию)
  filtered.sort((a, b) => a.molar_mass - b.molar_mass);
  
  state.filteredGases = filtered;
}

export const { 
  setGases, 
  setLoading, 
  setError, 
  setFilters,
  clearFilters,
  setSearchValue
} = gasSlice.actions;

// Селекторы
export const useFilteredGases = () => {
  return useAppSelector((state: any) => state.gas?.filteredGases || []);
};

export const useGasLoading = () => {
  return useAppSelector((state: any) => state.gas?.loading || false);
};

export const useGasError = () => {
  return useAppSelector((state: any) => state.gas?.error || null);
};

// Селектор для получения текущих фильтров
export const useGasFilters = () => {
  return useAppSelector((state: any) => state.gas?.filters || { minMolarMass: undefined, maxMolarMass: undefined });
};

// Селектор для получения всех газов (без фильтров)
export const useAllGases = () => {
  return useAppSelector((state: any) => state.gas?.gases || []);
};

// Селектор для получения значения поиска
export const useGasSearchValue = () => {
  return useAppSelector((state: any) => state.gas?.searchValue || '');
};

export default gasSlice.reducer;


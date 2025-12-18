import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Gas } from "../components/GasCard";

// Тип для начального состояния
interface GasCalculationState {
  Gases: Gas[];
  CalculationTotal: number; // Общая молярная масса для расчетов
}

// Начальное состояние
// Можно задать начальные данные или оставить пустым для загрузки через AJAX
const initialState: GasCalculationState = {
  Gases: [
    // Пример начальных данных газов (можно удалить, если загружаете через AJAX)
    {
      id: 1,
      title: "Водород",
      formula: "H₂",
      molar_mass: 2.016,
      description: "Самый легкий химический элемент, бесцветный газ без запаха и вкуса."
    },
    {
      id: 2,
      title: "Кислород",
      formula: "O₂",
      molar_mass: 32.0,
      description: "Жизненно важный газ, необходимый для дыхания большинства живых организмов."
    }
  ],
  CalculationTotal: 0, // Начальная общая молярная масса для расчетов
};

// Создание слайса
const gasCalculationSlice = createSlice({
  name: "gasCalculation",
  initialState,
  // Редьюсеры в слайсах мутируют состояние и ничего не возвращают наружу
  reducers: {
    // Изменяем состояние на полученные данные газов
    setGases(state, action: PayloadAction<Gas[]>) {
      state.Gases = action.payload;
    },
    // Суммируем молярные массы выбранных газов для расчетов
    addToCalculation(state, action: PayloadAction<number>) {
      state.CalculationTotal += action.payload;
    },
    // Обнуляем общую молярную массу расчетов
    clearCalculation(state) {
      state.CalculationTotal = 0;
    },
    // Дополнительные редьюсеры (можно использовать позже)
    addGas(state, action: PayloadAction<Gas>) {
      state.Gases.push(action.payload);
    },
    removeGas(state, action: PayloadAction<number>) {
      state.Gases = state.Gases.filter(gas => gas.id !== action.payload);
    },
    clearGases(state) {
      state.Gases = [];
    }
  }
});

// Экспорт действий (actions)
export const {
  setGases: setGasesAction,
  addToCalculation: addToCalculationAction,
  clearCalculation: clearCalculationAction,
  addGas: addGasAction,
  removeGas: removeGasAction,
  clearGases: clearGasesAction
} = gasCalculationSlice.actions;

// Экспорт редьюсера
export default gasCalculationSlice.reducer;


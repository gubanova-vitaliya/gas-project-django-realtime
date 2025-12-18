/**
 * Пользовательский хук для получения данных газов из Redux store
 * Используйте useAppSelector для типизированного доступа
 */

import { useAppSelector } from './useTypedRedux';

export const useGases = () => {
  return useAppSelector((state) => state.gasCalculation.Gases);
};

export const useCalculationTotal = () => {
  return useAppSelector((state) => state.gasCalculation.CalculationTotal);
};


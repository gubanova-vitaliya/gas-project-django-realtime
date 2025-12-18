/**
 * Пользовательский хук с AJAX запросом для загрузки данных газов
 * Использует axios для получения данных с API и сохранения в Redux store
 */

import { useEffect } from "react";
import axios from "axios";
import { setGasesAction } from "../slices/dataSlice";
import { useAppDispatch } from "./useTypedRedux";
import { Gas } from "../components/GasCard";

export function GetGases() {
  const dispatch = useAppDispatch();

  async function fetchGases() {
    try {
      // Получение данных газов с API
      // Замените URL на ваш API для получения газов
      const response = await axios.get<Gas[]>('/api/gases');
      // Отправка действия для сохранения данных в Redux store
      dispatch(setGasesAction(response.data));
    } catch (error) {
      console.error("Error fetching gases:", error);
      // Можно добавить обработку ошибок, например, установить состояние ошибки
    }
  }

  useEffect(() => {
    fetchGases();
  }, []); // Пустой массив зависимостей означает, что эффект выполнится только при монтировании
}


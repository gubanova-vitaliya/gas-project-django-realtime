import { Gas } from "../components/GasCard";
import { getDestApi } from "../../target_config";

const createGasesMock = (): Gas[] => {
  // Получаем базовый URL API для формирования путей к MinIO
  const apiBase = getDestApi();
  
  // Вспомогательная функция для формирования URL изображения из MinIO
  const getMinIOImageUrl = (imageName: string): string | null => {
    // Если API не настроен, возвращаем null (будет использован placeholder)
    if (!apiBase || apiBase === '') {
      return null;
    }
    // Формируем путь к изображению через API прокси MinIO
    // Путь будет преобразован в полный URL через transformImageUrl в gasApi.ts
    return `/api/minio/gases/${imageName}`;
  };
  
  // Сопоставление газов с изображениями из MinIO
  // Изображения находятся в bucket "gases" в MinIO
  return [
    {
      id: 1,
      title: "Водород",
      formula: "H₂",
      molar_mass: 2.016,
      image_url: getMinIOImageUrl("vodolod.webp"),
      description: "Самый легкий химический элемент, бесцветный газ без запаха и вкуса.",
      description_en: "The lightest chemical element, a colorless, odorless, and tasteless gas.",
    },
    {
      id: 2,
      title: "Кислород",
      formula: "O₂",
      molar_mass: 32.0,
      image_url: getMinIOImageUrl("kislorod.webp"),
      description: "Жизненно важный газ, необходимый для дыхания большинства живых организмов.",
      description_en: "A vital gas essential for respiration in most living organisms.",
    },
    {
      id: 3,
      title: "Азот",
      formula: "N₂",
      molar_mass: 28.014,
      image_url: getMinIOImageUrl("azot.webp"),
      description: "Инертный газ, составляющий основную часть атмосферы Земли.",
      description_en: "An inert gas that makes up the majority of Earth's atmosphere.",
    },
    {
      id: 4,
      title: "Углекислый газ",
      formula: "CO₂",
      molar_mass: 44.01,
      image_url: getMinIOImageUrl("uglekisliy_gas.webp"),
      description: "Газ, образующийся при дыхании и сжигании органических веществ.",
      description_en: "A gas produced during respiration and the combustion of organic substances.",
    },
    {
      id: 5,
      title: "Метан",
      formula: "CH₄",
      molar_mass: 16.043,
      image_url: getMinIOImageUrl("vodolod.webp"), // Используем водород как placeholder, пока нет изображения метана
      description: "Основной компонент природного газа, простейший углеводород.",
      description_en: "The main component of natural gas, the simplest hydrocarbon.",
    },
    {
      id: 6,
      title: "Гелий",
      formula: "He",
      molar_mass: 4.003,
      image_url: getMinIOImageUrl("geliy.png"),
      description: "Инертный газ, второй по легкости элемент, используется в воздушных шарах.",
      description_en: "An inert gas, the second lightest element, used in balloons.",
    },
  ];
};

export const GASES_MOCK: Gas[] = createGasesMock();

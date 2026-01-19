import { FC } from "react";
import { Card, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import "./GasCard.css";
import { getDestRoot } from "../../target_config";
import { AppDispatch, RootState } from "../store";
import { addGasToVesselPressure, getAllDraftsAsync } from "../slices/vesselPressureSlice";
import { loadCartData } from "../hooks/useCartData";

// Получаем placeholder изображение, если изображение из MinIO недоступно
const getPlaceholderImage = () => {
  const destRoot = getDestRoot();
  if (destRoot === '') {
    return '/gas-images/i.webp'; // Используем дефолтное изображение газа вместо slide1
  }
  const base = destRoot.endsWith('/') ? destRoot : destRoot + '/';
  return base + 'gas-images/i.webp';
};

export interface Gas {
  id: number;
  title: string;
  formula: string;
  molar_mass: number;
  image_url?: string | null;
  description?: string;
  description_en?: string; // Английское описание для вычисления эмбеддингов
  embedding?: number[]; // Эмбеддинг описания
}

interface GasCardProps {
  gas: Gas;
  onCardClick: (id: number) => void;
}

export const GasCard: FC<GasCardProps> = ({ gas, onCardClick }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    // Логируем ошибку для отладки
    console.warn(`Failed to load image from MinIO: ${target.src}, falling back to placeholder`);
    const placeholderPath = getPlaceholderImage();
    // Не зацикливаемся на ошибках - если placeholder тоже не загрузился, оставляем как есть
    if (target.src !== placeholderPath && !target.src.includes('gas-images/i.webp')) {
      target.src = placeholderPath;
    }
  };

  // Обработчик добавления газа в заявку
  const handleAdd = async () => {
    if (gas.id) {
      try {
        const result = await dispatch(addGasToVesselPressure(gas.id));
        if (addGasToVesselPressure.fulfilled.match(result)) {
          // Обновляем корзину после успешного добавления
          await loadCartData(dispatch);
          // Обновляем все черновики, чтобы они отображались в журнале
          await dispatch(getAllDraftsAsync());
          // Не переходим на другую страницу - остаемся на текущей
        }
      } catch (error) {
        console.error('Error adding gas to calculation:', error);
      }
    }
  };

  return (
    <Card className="gas-card">
            <Card.Img
              className="card-image"
              variant="top"
              src={gas.image_url || getPlaceholderImage()}
              alt={gas.title}
              onClick={() => onCardClick(gas.id)}
              onError={handleImageError}
              style={{ cursor: "pointer" }}
            />
      <Card.Body>
        <div className="text-style">
          <Card.Title>{gas.title}</Card.Title>
        </div>
        <div className="text-style">
          <Card.Text>
            <strong>Формула:</strong> {gas.formula}
          </Card.Text>
        </div>
        <div className="text-style">
          <Card.Text>
            <strong>Молярная масса:</strong> {gas.molar_mass.toFixed(2)} г/моль
          </Card.Text>
        </div>
        {gas.description && (
          <div className="text-style description">
            <Card.Text>{gas.description}</Card.Text>
          </div>
        )}
        <div className="card-buttons">
          <Button
            className="card-button"
            variant="primary"
            onClick={() => onCardClick(gas.id)}
          >
            Подробнее
          </Button>
          {isAuthenticated && (
            <Button
              className="card-button-add"
              variant="success"
              onClick={handleAdd}
            >
              Добавить
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};


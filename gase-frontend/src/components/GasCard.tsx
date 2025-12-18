import { FC } from "react";
import { Card, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import "./GasCard.css";
import { getDestRoot } from "../../target_config";
import { AppDispatch, RootState } from "../store";
import { addGasToCalculation } from "../slices/calculationSlice";
import { loadCartData } from "../hooks/useCartData";

// Получаем базовый путь для правильного формирования путей
const getDefaultImage = () => {
  const destRoot = getDestRoot();
  if (destRoot === '') {
    return '/slide1.svg';
  }
  const base = destRoot.endsWith('/') ? destRoot : destRoot + '/';
  return base + 'slide1.svg';
};

export interface Gas {
  id: number;
  title: string;
  formula: string;
  molar_mass: number;
  image_url?: string | null;
  description?: string;
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
    console.warn(`Failed to load image: ${target.src}, falling back to default image`);
    const defaultImagePath = getDefaultImage();
    if (target.src !== defaultImagePath && !target.src.includes('slide1.svg')) {
      target.src = defaultImagePath;
    }
  };

  // Обработчик добавления газа в заявку
  const handleAdd = async () => {
    if (gas.id) {
      try {
        const result = await dispatch(addGasToCalculation(gas.id));
        if (addGasToCalculation.fulfilled.match(result)) {
          // Обновляем корзину после успешного добавления
          await loadCartData(dispatch);
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
              src={gas.image_url || getDefaultImage()}
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


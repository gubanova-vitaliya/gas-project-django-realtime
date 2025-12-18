import "./GasDetailPage.css";
import { FC, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Gas } from "../components/GasCard";
import { getGasById } from "../modules/gasApi";
import { Spinner } from "react-bootstrap";
import { getDestRoot } from "../../target_config";

// Получаем базовый путь для правильного формирования путей
const getDefaultImage = () => {
  const destRoot = getDestRoot();
  if (destRoot === '') {
    return '/slide1.svg';
  }
  const base = destRoot.endsWith('/') ? destRoot : destRoot + '/';
  return base + 'slide1.svg';
};

export const GasDetailPage: FC = () => {
  const [pageData, setPageData] = useState<Gas | null>(null);
  const [loading, setLoading] = useState(true);

  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getGasById(parseInt(id))
      .then((gas) => {
        setPageData(gas);
      })
      .catch((error) => {
        console.error("Error loading gas:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Если изображение не загрузилось (из MinIO или другого источника), используем дефолтное
    const target = e.target as HTMLImageElement;
    const defaultImagePath = getDefaultImage();
    if (target.src !== defaultImagePath) {
      target.src = defaultImagePath;
    }
  };

  if (loading) {
    return (
      <div className="gas-detail-page">
        <div className="loader-block">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="gas-detail-page">
        <div className="gas-detail-container">
          <div className="gas-card">
            <div className="not-found">
              <h2>Газ не найден</h2>
              <p>Запрошенный газ не существует или был удален</p>
              <div className="yellow-btn disabled-link">
                Вернитесь в каталог через меню навигации
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gas-detail-page">
      <div className="gas-detail-container">
        <div className="gas-card">
          <div className="gas-header">
            <h1>{pageData.title}</h1>
            <span className="gas-formula">{pageData.formula}</span>
          </div>

          <div className="gas-image">
                <img
                  src={pageData.image_url || getDefaultImage()}
                  alt={pageData.title}
                  onError={handleImageError}
                  loading="lazy"
                />
          </div>

          <div className="gas-properties">
            <div className="property-card">
              <div className="property-label">Молярная масса</div>
              <div className="property-value">
                {pageData.molar_mass.toFixed(2)} г/моль
              </div>
            </div>
            <div className="property-card">
              <div className="property-label">ID газа</div>
              <div className="property-value">#{pageData.id}</div>
            </div>
          </div>

          <div className="gas-description">
            {pageData.description || "Описание отсутствует"}
          </div>
        </div>
      </div>
    </div>
  );
};

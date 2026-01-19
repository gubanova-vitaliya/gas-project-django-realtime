import "./GasDetailPage.css";
import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Gas } from "../components/GasCard";
import { getGasById, getGases } from "../modules/gasApi";
import { Spinner, Card } from "react-bootstrap";
import { getDestRoot } from "../../target_config";
import { useSimilarGases } from "../hooks/useSimilarGases";
import { RootState } from "../store";

// Получаем базовый путь для правильного формирования путей
const getPlaceholderImage = () => {
  const destRoot = getDestRoot();
  if (destRoot === '') {
    return '/gas-images/i.webp'; // Используем дефолтное изображение газа вместо slide1
  }
  const base = destRoot.endsWith('/') ? destRoot : destRoot + '/';
  return base + 'gas-images/i.webp';
};

export const GasDetailPage: FC = () => {
  const [pageData, setPageData] = useState<Gas | null>(null);
  const [loading, setLoading] = useState(true);
  const [allGases, setAllGases] = useState<Gas[]>([]);
  const navigate = useNavigate();

  // Проверяем, является ли пользователь гостем (неавторизованным)
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const isGuest = !isAuthenticated;

  const { id } = useParams<{ id: string }>();
  const gasId = id ? parseInt(id) : null;

  // Загружаем все газы для поиска похожих только для гостей
  useEffect(() => {
    if (isGuest) {
      getGases()
        .then((gases) => {
          setAllGases(gases);
        })
        .catch((error) => {
          console.error("Error loading all gases:", error);
        });
    } else {
      // Для авторизованных пользователей не загружаем газы для похожих
      setAllGases([]);
    }
  }, [isGuest]);

  // Загружаем данные текущего газа
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

  // Используем хук для поиска похожих газов только для гостей
  const { similarGases, ready, error: similarError } = useSimilarGases(
    isGuest ? allGases : [], 
    isGuest ? gasId : null
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Если изображение не загрузилось из MinIO, используем placeholder
    const target = e.target as HTMLImageElement;
    console.warn(`Failed to load image from MinIO: ${target.src}, falling back to placeholder`);
    const placeholderPath = getPlaceholderImage();
    // Не зацикливаемся на ошибках - если placeholder тоже не загрузился, оставляем как есть
    if (target.src !== placeholderPath && !target.src.includes('gas-images/i.webp')) {
      target.src = placeholderPath;
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
                  src={pageData.image_url || getPlaceholderImage()}
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

        {/* Секция похожих газов - только для гостей (неавторизованных пользователей) */}
        {isGuest && allGases.length > 0 && (
          <div className="similar-gases-section">
            <h2 className="similar-gases-title">Похожие газы</h2>
            {!ready && (
              <div className="similar-gases-loading">
                <p className="text-muted">Загрузка модели...</p>
              </div>
            )}
            {similarError && (
              <div className="alert alert-warning">
                Ошибка при поиске похожих газов: {similarError}
              </div>
            )}
            {ready && similarGases.length > 0 && (
              <div className="similar-gases-list">
                {similarGases.map((gas) => (
                  <Card key={gas.id} className="similar-gas-card" onClick={() => navigate(`/gases/${gas.id}`)}>
                    <Card.Img
                      variant="top"
                      src={gas.image_url || getPlaceholderImage()}
                      alt={gas.title}
                      onError={handleImageError}
                      style={{ height: '150px', objectFit: 'cover', cursor: 'pointer' }}
                    />
                    <Card.Body>
                      <Card.Title>{gas.title}</Card.Title>
                      <Card.Text>
                        <strong>Формула:</strong> {gas.formula}
                      </Card.Text>
                      <Card.Text>
                        <strong>Молярная масса:</strong> {gas.molar_mass.toFixed(2)} г/моль
                      </Card.Text>
                      {gas.description && (
                        <Card.Text className="text-muted small">
                          {gas.description}
                        </Card.Text>
                      )}
                      <div className="similarity-badge">
                        Сходство: {(gas.similarity * 100).toFixed(1)}%
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
            {ready && similarGases.length === 0 && (
              <p className="text-muted text-center">Похожие газы не найдены</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

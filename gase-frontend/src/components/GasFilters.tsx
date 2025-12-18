import { FC, useState, useEffect } from "react";
import { useAppDispatch } from "../hooks/useTypedRedux";
import { setFilters, useGasFilters, clearFilters } from "../slices/gasSlice";
import "./GasFilters.css";

// Предустановленные диапазоны молярной массы
const PRESET_RANGES = [
  { label: "Легкие (< 10 г/моль)", min: 0, max: 10 },
  { label: "Средние (10-30 г/моль)", min: 10, max: 30 },
  { label: "Тяжелые (30-50 г/моль)", min: 30, max: 50 },
];

export const GasFilters: FC = () => {
  const dispatch = useAppDispatch();
  // Получаем текущие фильтры из Redux
  const filters = useGasFilters();
  
  // Локальное состояние для полей ввода
  const [minMass, setMinMass] = useState<string>(filters.minMolarMass?.toString() || '');
  const [maxMass, setMaxMass] = useState<string>(filters.maxMolarMass?.toString() || '');
  const [rangeError, setRangeError] = useState<string>('');

  // Синхронизируем локальное состояние с Redux при изменении фильтров извне
  useEffect(() => {
    setMinMass(filters.minMolarMass?.toString() || '');
    setMaxMass(filters.maxMolarMass?.toString() || '');
  }, [filters.minMolarMass, filters.maxMolarMass]);

  const handleMinMassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinMass(value);
    const numValue = value === '' ? undefined : parseFloat(value);
    
    // Валидация: min не должен быть больше max
    if (numValue !== undefined && !isNaN(numValue) && 
        filters.maxMolarMass !== undefined && !isNaN(filters.maxMolarMass) &&
        numValue > filters.maxMolarMass) {
      setRangeError('Минимальное значение не может быть больше максимального');
    } else {
      setRangeError('');
    }
    
    // Обновляем фильтр в Redux
    dispatch(setFilters({ minMolarMass: numValue }));
  };

  const handleMaxMassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxMass(value);
    const numValue = value === '' ? undefined : parseFloat(value);
    
    // Валидация: max не должен быть меньше min
    if (numValue !== undefined && !isNaN(numValue) && 
        filters.minMolarMass !== undefined && !isNaN(filters.minMolarMass) &&
        numValue < filters.minMolarMass) {
      setRangeError('Максимальное значение не может быть меньше минимального');
    } else {
      setRangeError('');
    }
    
    // Обновляем фильтр в Redux
    dispatch(setFilters({ maxMolarMass: numValue }));
  };

  const handlePresetRange = (min: number | undefined, max: number | undefined) => {
    setMinMass(min?.toString() || '');
    setMaxMass(max?.toString() || '');
    setRangeError('');
    dispatch(setFilters({ minMolarMass: min, maxMolarMass: max }));
  };

  const handleClear = () => {
    // Сбрасываем все фильтры
    setMinMass('');
    setMaxMass('');
    setRangeError('');
    dispatch(clearFilters());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const hasActiveFilters = filters.minMolarMass !== undefined || filters.maxMolarMass !== undefined;

  return (
    <div className="filters-container">
      <form className="filters-form" onSubmit={handleSubmit}>
        <div className="filters-header">
          <h3>Фильтры по молярной массе</h3>
        </div>
        
        <div className="preset-ranges">
          <span className="preset-label">Быстрый выбор:</span>
          <div className="preset-buttons">
            {PRESET_RANGES.map((range, index) => (
              <button
                key={index}
                type="button"
                className="preset-button"
                onClick={() => handlePresetRange(range.min, range.max)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="min-mass">Минимальная молярная масса (г/моль):</label>
            <input
              id="min-mass"
              type="number"
              step="0.01"
              min="0"
              placeholder="От"
              value={minMass}
              onChange={handleMinMassChange}
              className={rangeError ? 'error' : ''}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="max-mass">Максимальная молярная масса (г/моль):</label>
            <input
              id="max-mass"
              type="number"
              step="0.01"
              min="0"
              placeholder="До"
              value={maxMass}
              onChange={handleMaxMassChange}
              className={rangeError ? 'error' : ''}
            />
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={handleClear} className="clear-button">
              Очистить
            </button>
          )}
        </div>
        
        {rangeError && (
          <div className="range-error">
            {rangeError}
          </div>
        )}
      </form>
    </div>
  );
};


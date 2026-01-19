# Асинхронный сервис расчета давления газа

Этот сервис выполняет асинхронные расчеты финального давления газа и отправляет результаты обратно в основной сервис.

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv env
```

2. Активируйте виртуальное окружение:
```bash
# Windows
env\Scripts\activate

# Linux/Mac
source env/bin/activate
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

4. Примените миграции:
```bash
python manage.py migrate
```

## Запуск

```bash
python manage.py runserver 0.0.0.0:8001
```

Сервис будет доступен на порту 8001.

## API

### POST /

Запускает асинхронный расчет давления газа.

**Параметры:**
- `gas_vessel_pressure_id` (required) - ID записи GasVesselPressure
- `initial_pressure` (optional) - начальное давление
- `initial_temperature` (optional) - начальная температура
- `final_temperature` (optional) - конечная температура
- `volume` (optional) - объем
- `gas_amount` (optional) - количество вещества

**Ответ:**
```json
{
  "status": "accepted",
  "gas_vessel_pressure_id": 123
}
```

Расчет выполняется асинхронно с задержкой 5-10 секунд, после чего результат отправляется обратно в основной сервис через PUT-запрос.





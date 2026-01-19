# Настройка и запуск асинхронного сервиса

## Требования

- Python 3.8+
- pip

## Установка

1. Перейдите в директорию async_service:
```bash
cd async_service
```

2. Создайте виртуальное окружение:
```bash
python -m venv env
```

3. Активируйте виртуальное окружение:
```bash
# Windows PowerShell
.\env\Scripts\Activate.ps1

# Windows CMD
env\Scripts\activate.bat

# Linux/Mac
source env/bin/activate
```

**Примечание для Windows PowerShell:** Если при активации появляется ошибка о политике выполнения скриптов, выполните:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

4. Установите зависимости:
```bash
pip install -r requirements.txt
```

5. Примените миграции (если требуется):
```bash
python manage.py migrate
```

## Запуск

```bash
python manage.py runserver 0.0.0.0:8001
```

Сервис будет доступен на `http://localhost:8001`

## Настройка URL основного сервиса

В файле `app/views.py` измените `CALLBACK_URL` на URL вашего основного Go-сервиса:

```python
CALLBACK_URL = "http://localhost:8080/api/mm/gas/"
```

## Настройка токена авторизации

В файле `app/views.py` и в основном сервисе (`internal/app/handler/calculation.go`) должен быть одинаковый токен:

```python
# async_service/app/views.py
AUTH_TOKEN = "a1b2c3d4e5f6g7h8"
```

```go
// internal/app/handler/calculation.go
const AUTH_TOKEN = "a1b2c3d4e5f6g7h8"
```

## Тестирование

Отправьте POST-запрос к асинхронному сервису:

```bash
curl -X POST http://localhost:8001/ \
  -H "Content-Type: application/json" \
  -d '{
    "gas_calc_id": 1,
    "initial_pressure": 1.0,
    "initial_temperature": 273.15,
    "final_temperature": 373.15,
    "volume": 0.001,
    "gas_amount": 0.1
  }'
```

Сервис сразу вернет ответ 200 OK, а через 5-10 секунд отправит результат расчета обратно в основной сервис.


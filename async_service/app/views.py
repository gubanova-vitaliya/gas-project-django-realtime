from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

import time
import random
import requests
from concurrent import futures

# URL основного сервиса для отправки результатов
CALLBACK_URL = "http://localhost:8080/api/mm/gas/"

# Токен для авторизации (8 байт = 16 символов hex)
AUTH_TOKEN = "a1b2c3d4e5f6g7h8"

# Пул потоков для асинхронного выполнения задач
executor = futures.ThreadPoolExecutor(max_workers=1)

def calculate_gas_pressure_async(gas_vessel_pressure_id, initial_pressure, initial_temperature, 
                                 final_temperature, volume, gas_amount):
    """
    Асинхронная функция для расчета финального давления газа в сосуде.
    Имитирует долгий расчет с задержкой 5-10 секунд.
    """
    # Случайная задержка от 5 до 10 секунд
    delay = random.uniform(5, 10)
    time.sleep(delay)
    
    # Расчет финального давления по формуле идеального газа
    # P2 = (n * R * T2) / V
    # где n - количество вещества, R - газовая постоянная, T2 - конечная температура, V - объем
    R = 8.314462618  # Газовая постоянная
    
    if gas_amount and final_temperature and volume and volume > 0:
        # Расчет давления в Паскалях
        pressure_pa = (gas_amount * R * final_temperature) / volume
        # Конвертация в атмосферы
        pressure_atm = pressure_pa / 101325.0
    else:
        # Если данных недостаточно, возвращаем случайное значение
        pressure_atm = random.uniform(0.5, 2.0)
    
    return {
        "id": gas_vessel_pressure_id,
        "final_pressure": round(pressure_atm, 4),
    }

def vessel_pressure_callback(task):
    """
    Колбэк для отправки результата расчета давления сосуда обратно в основной сервис.
    """
    try:
        result = task.result()
        print(f"Vessel pressure calculation completed for gas_vessel_pressure_id={result['id']}, pressure={result['final_pressure']}")
    except futures._base.CancelledError:
        return
    except Exception as e:
        print(f"Error in calculation: {e}")
        return
    
    # Отправляем PUT-запрос к основному сервису
    nurl = f"{CALLBACK_URL}{result['id']}/result"
    answer = {
        "final_pressure": result["final_pressure"],
        "auth_token": AUTH_TOKEN,
    }
    
    try:
        response = requests.put(nurl, json=answer, timeout=10)
        print(f"Callback response status: {response.status_code}")
    except Exception as e:
        print(f"Error sending callback: {e}")

@api_view(['GET', 'POST'])
def calculate_gas_pressure(request):
    """
    Обработчик GET/POST запросов для асинхронного сервиса расчета давления газа в сосуде.
    GET: возвращает информацию о сервисе
    POST: запускает асинхронный расчет давления газа в сосуде
    """
    if request.method == 'GET':
        # Для GET запроса возвращаем информацию о сервисе
        return Response({
            "service": "Async Gas Vessel Pressure Calculation Service",
            "version": "1.0",
            "endpoint": "/",
            "method": "POST",
            "description": "Отправьте POST запрос с параметрами для расчета давления газа в сосуде",
            "required_fields": ["gas_vessel_pressure_id"],
            "optional_fields": ["initial_pressure", "initial_temperature", "final_temperature", "volume", "gas_amount"]
        }, status=status.HTTP_200_OK)
    
    # POST запрос - обработка расчета
    if "gas_vessel_pressure_id" not in request.data.keys():
        return Response(
            {"error": "gas_vessel_pressure_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    gas_vessel_pressure_id = request.data["gas_vessel_pressure_id"]
    initial_pressure = request.data.get("initial_pressure")
    initial_temperature = request.data.get("initial_temperature")
    final_temperature = request.data.get("final_temperature")
    volume = request.data.get("volume")
    gas_amount = request.data.get("gas_amount")
    
    # Запускаем задачу в фоновом режиме
    task = executor.submit(
        calculate_gas_pressure_async,
        gas_vessel_pressure_id,
        initial_pressure,
        initial_temperature,
        final_temperature,
        volume,
        gas_amount
    )
    task.add_done_callback(vessel_pressure_callback)
    
    # Сразу возвращаем ответ 200 OK
    return Response(
        {"status": "accepted", "gas_vessel_pressure_id": gas_vessel_pressure_id},
        status=status.HTTP_200_OK
    )


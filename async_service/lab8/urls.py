"""
URL configuration for lab8 project.
"""
from django.contrib import admin
from django.urls import path
from app import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.calculate_gas_pressure, name='calculate-gas-pressure'),
]





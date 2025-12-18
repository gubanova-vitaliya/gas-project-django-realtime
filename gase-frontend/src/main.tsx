import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import store from './store'
import { checkAuth, getUserProfileAsync } from './slices/userSlice'
import { getDestRoot } from '../target_config'
import { addGasToCart, getCartCount } from './modules/cartApi'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

// Проверяем авторизацию при загрузке приложения
store.dispatch(checkAuth());
// Загружаем профиль, если пользователь авторизован
const token = localStorage.getItem('auth_token');
if (token) {
  store.dispatch(getUserProfileAsync());
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={getDestRoot()}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)

// Делаем метод журнала расчетов доступным в браузере для просмотра
if (typeof window !== 'undefined') {
  (window as any).addGasToCart = addGasToCart;
  (window as any).getCartCount = getCartCount;
  console.log('📋 Метод журнала расчетов доступен в браузере:');
  console.log('   - window.addGasToCart(gasId) - добавить газ в журнал');
  console.log('   - window.getCartCount() - получить количество элементов');
  console.log('   Пример: window.addGasToCart(1)');
}

if ("serviceWorker" in navigator) {
  registerSW({
    onNeedRefresh() {
      // Показываем уведомление о необходимости обновления
      console.log("New content available, please refresh");
    },
    onOfflineReady() {
      // Приложение готово к работе оффлайн
      console.log("App ready to work offline");
    },
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        console.log("Service Worker registered:", registration);
      }
    },
    onRegisterError(error: Error) {
      console.error("Service Worker registration error:", error);
    }
  })
}

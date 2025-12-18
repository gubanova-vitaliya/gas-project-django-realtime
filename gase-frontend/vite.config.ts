import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'
import path from 'path'

// Конфигурация для GitHub Pages
// При сборке для production всегда используем путь репозитория для GitHub Pages
// Проверяем через mode или command, так как NODE_ENV может быть не установлен на этапе загрузки конфига
const isGitHubPages = process.env.VITE_GITHUB_PAGES === 'true';
const REPO_NAME = process.env.VITE_REPO_NAME || 'gas-project-frontend';
const GITHUB_PAGES_BASE = REPO_NAME ? `/${REPO_NAME}/` : '/';
// Для GitHub Pages используем путь репозитория, иначе корневой путь
// По умолчанию для production используем путь репозитория
const dest_root = isGitHubPages ? GITHUB_PAGES_BASE : '/';

// API адреса (используем process.env в конфигурации Vite)
const api_proxy_addr = process.env.VITE_API_URL || 'http://localhost:8080';
const notes_api_addr = process.env.VITE_NOTES_API_URL || 'http://localhost:8081';
const img_proxy_addr = process.env.VITE_IMG_PROXY_URL || 'http://localhost:8080';

// Плагин для копирования index.html в 404.html для GitHub Pages
const copy404Plugin = () => {
  return {
    name: 'copy-404',
    writeBundle() {
      const distPath = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distPath, 'index.html');
      const html404Path = path.join(distPath, '404.html');
      
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, html404Path);
        console.log('✅ 404.html создан для GitHub Pages');
      }
    }
  };
};

export default defineConfig(({ command, mode }) => {
  // При сборке (build) всегда используем путь репозитория для GitHub Pages
  const shouldUseGitHubPages = isGitHubPages || (command === 'build' && mode === 'production');
  const finalDestRoot = shouldUseGitHubPages ? GITHUB_PAGES_BASE : '/';
  
  return {
  plugins: [
    react(),
    mkcert({
      // Автоматически создавать сертификаты для localhost и IP адресов
      // Это позволит работать на мобильных устройствах в локальной сети
      hosts: ['localhost', '127.0.0.1'],
      // Автоматически добавлять IP адреса локальной сети
      autoUpgrade: true,
    }),
    // Копируем index.html в 404.html для GitHub Pages SPA support
    ...(command === 'build' ? [copy404Plugin()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Gase Application",
        short_name: "Gase App",
        description: "Приложение для работы с газами и расчетами",
        start_url: finalDestRoot,
        display: "standalone",
        background_color: "#fdfdfd",
        theme_color: "#db4938",
        orientation: "portrait-primary",
        icons: [
          {
            src: `${finalDestRoot}slide1.svg`,
            type: "image/svg+xml",
            sizes: "192x192",
            purpose: "any maskable"
          },
          {
            src: `${finalDestRoot}slide1.svg`,
            type: "image/svg+xml",
            sizes: "512x512",
            purpose: "any maskable"
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  base: finalDestRoot,
  server: {
    port: 3000,
    strictPort: false, // Позволяет использовать другой порт, если 3000 занят
    // Для production сборки HTTPS не нужен - GitHub Pages предоставляет его автоматически
    // Для dev режима vite-plugin-mkcert автоматически настроит HTTPS
    https: command === 'build' ? undefined : true,
    proxy: {
      "/api": {
        target: api_proxy_addr,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('❌ [Proxy Error]', err.message);
            console.log('💡 Проверьте, что Go Backend запущен на', api_proxy_addr);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔵 [Proxy]', req.method, req.url, '→', api_proxy_addr + req.url);
          });
        },
      },
      "/notes-api": {
        target: notes_api_addr,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notes-api/, ""),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('❌ [Notes Proxy Error]', err.message);
            console.log('💡 Проверьте, что Notes Backend запущен на', notes_api_addr);
          });
        },
      },
      "/img-proxy": {
        target: img_proxy_addr,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-proxy/, ""),
      },
    },
    watch: {
      usePolling: true,
    },
    host: true,
  },
  };
});

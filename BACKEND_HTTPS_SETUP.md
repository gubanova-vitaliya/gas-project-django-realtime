# Настройка HTTPS для бэкенда (для работы с GitHub Pages)

## Проблема

GitHub Pages работает только по HTTPS, а бэкенд по умолчанию работает по HTTP. Это вызывает проблемы с CORS и mixed content (браузер блокирует HTTP запросы с HTTPS страниц).

## Решение

Настроить бэкенд для работы по HTTPS используя локальные сертификаты через `mkcert`.

---

## Шаг 1: Установка mkcert

### Windows:

#### Вариант 1: Через Chocolatey (рекомендуется)

1. Установите Chocolatey (если еще не установлен):
   ```powershell
   # Запустите PowerShell от имени администратора
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. Установите mkcert:
   ```powershell
   choco install mkcert
   ```

#### Вариант 2: Через Scoop

1. Установите Scoop (если еще не установлен):
   ```powershell
   # Запустите PowerShell от имени администратора
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. Установите mkcert:
   ```powershell
   scoop bucket add extras
   scoop install mkcert
   ```

#### Вариант 3: Через npm (если политика выполнения разрешена)

**Если получаете ошибку "running scripts is disabled":**

**Решение A:** Измените политику выполнения (PowerShell от имени администратора):
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Затем установите:
```powershell
npm install -g mkcert
```

**Решение B:** Используйте CMD вместо PowerShell:
```cmd
npm install -g mkcert
```

**Решение C:** Обойдите политику для одной команды:
```powershell
powershell -ExecutionPolicy Bypass -Command "npm install -g mkcert"
```

#### Вариант 4: Скачать бинарник напрямую (без установщика)

1. Перейдите на https://github.com/FiloSottile/mkcert/releases
2. Скачайте `mkcert-v1.4.4-windows-amd64.exe` (или последнюю версию)
3. Переименуйте в `mkcert.exe`
4. Поместите в папку, которая есть в PATH (например, `C:\Windows\System32\` или создайте папку `C:\tools\` и добавьте в PATH)

**Проверка установки:**
```powershell
mkcert --version
```

### Linux/Mac:

```bash
# Ubuntu/Debian
sudo apt install mkcert

# Mac (Homebrew)
brew install mkcert

# Или через npm
npm install -g mkcert
```

---

## Шаг 2: Создание Certificate Authority (CA)

Создайте локальный Certificate Authority:

```bash
mkcert create-ca
```

Эта команда создаст два файла:
- `ca.crt` - публичный ключ Authority
- `ca.key` - приватный ключ Authority

**Примечание:** Если вы используете npm версию mkcert (установленную через `npm install -g mkcert`), команды работают так же, но нет команды `-install` для автоматической установки CA.

---

## Шаг 3: Установка CA в систему

### Windows:

**Для npm версии mkcert (установленной через npm):**

Установка CA должна быть сделана **вручную**:

1. Найдите файл `ca.crt` в текущей директории
2. Двойной клик на `ca.crt`
3. Нажмите "Установить сертификат"
4. Выберите "Локальный компьютер" → Далее
5. Выберите "Поместить все сертификаты в следующее хранилище"
6. Нажмите "Обзор" и выберите **"Доверенные корневые центры сертификации"**
7. Нажмите "Далее" → "Готово"
8. Подтвердите установку

**Альтернативный способ (через PowerShell от имени администратора):**

```powershell
# Импортируйте сертификат в хранилище
Import-Certificate -FilePath ".\ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### Linux:

```bash
sudo cp ca.crt /usr/local/share/ca-certificates/mkcert-ca.crt
sudo update-ca-certificates
```

### Mac:

1. Двойной клик на `ca.crt`
2. Откроется Keychain Access
3. Найдите "mkcert" или "Test CA" в списке
4. Двойной клик → "Доверие" → "Всегда доверять"

---

## Шаг 4: Создание сертификата для бэкенда

Узнайте ваш локальный IP адрес:

**Windows:**
```powershell
ipconfig
# Найдите IPv4 адрес (например, 192.168.1.100)
```

**Linux/Mac:**
```bash
ip addr show
# или
ifconfig
# Найдите inet адрес (например, 192.168.1.100)
```

Создайте сертификат для вашего IP и localhost:

```bash
# Замените 192.168.1.100 на ваш IP адрес
mkcert create-cert --domains localhost,127.0.0.1,192.168.1.100
```

Или создайте сертификат с несколькими IP:

```bash
mkcert create-cert --domains localhost,127.0.0.1,192.168.1.100,192.168.1.101
```

**Для npm версии mkcert** команда работает так же, но можно явно указать пути к CA:

```bash
mkcert create-cert --ca-key ca.key --ca-cert ca.crt --domains localhost,127.0.0.1,192.168.1.100
```

Эта команда создаст:
- `cert.crt` - публичный ключ сертификата
- `cert.key` - приватный ключ сертификата

---

## Шаг 5: Размещение сертификатов

Поместите файлы сертификатов в корень проекта (рядом с `main.go`):

```
gas-project-frontend/
├── cert.crt      ← публичный ключ сертификата
├── cert.key      ← приватный ключ сертификата (НЕ ПУБЛИКУЙТЕ!)
├── ca.crt        ← публичный ключ CA
├── ca.key         ← приватный ключ CA (НЕ ПУБЛИКУЙТЕ!)
└── cmd/
    └── GaseProject/
        └── main.go
```

**⚠️ ВАЖНО:** Добавьте в `.gitignore`:

```
*.key
*.crt
ca.key
cert.key
```

---

## Шаг 6: Запуск бэкенда

Запустите бэкенд как обычно:

```bash
go run cmd/GaseProject/main.go
```

Если сертификаты найдены, вы увидите в консоли:

```
🚀 Starting HTTPS server on https://0.0.0.0:8080
📝 Server is running on HTTPS protocol
```

Если сертификаты не найдены:

```
HTTPS certificates not found, starting HTTP server
💡 To enable HTTPS, create certificates using mkcert...
🚀 Starting HTTP server on http://0.0.0.0:8080
📝 Server is running on HTTP protocol
```

---

## Шаг 7: Настройка фронтенда

### Вариант 1: Через переменную окружения при сборке

```bash
cd gase-frontend
VITE_API_URL=https://192.168.1.100:8080 npm run build:gh-pages
```

**Замените `192.168.1.100` на ваш локальный IP адрес!**

### Вариант 2: Через meta tag в `index.html`

Отредактируйте `gase-frontend/index.html`:

```html
<meta name="api-url" content="https://192.168.1.100:8080" />
```

**Замените `192.168.1.100` на ваш локальный IP адрес!**

### Вариант 3: Через консоль браузера (для тестирования)

Откройте консоль браузера на GitHub Pages и выполните:

```javascript
window.__API_URL__ = 'https://192.168.1.100:8080';
location.reload();
```

---

## Шаг 8: Проверка работы

1. Запустите бэкенд с HTTPS
2. Убедитесь, что в консоли написано "Server is running on HTTPS protocol"
3. Откройте сайт на GitHub Pages
4. Откройте DevTools → Network
5. Проверьте, что запросы идут на `https://192.168.1.100:8080/api/...`
6. Проверьте, что нет CORS ошибок

---

## Решение проблем

### Проблема: "NET::ERR_CERT_AUTHORITY_INVALID"

**Решение:** Установите `ca.crt` в доверенные корневые сертификаты браузера (см. Шаг 3).

### Проблема: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Решение:** 
1. Убедитесь, что бэкенд запущен на HTTPS
2. Проверьте, что ваш IP адрес добавлен в сертификат
3. Проверьте логи бэкенда на наличие CORS ошибок

### Проблема: Бэкенд не запускается на HTTPS

**Решение:**
1. Проверьте, что `cert.crt` и `cert.key` находятся в правильной директории
2. Проверьте права доступа к файлам сертификатов
3. Убедитесь, что порт не занят другим процессом

### Проблема: Не могу подключиться с GitHub Pages

**Решение:**
1. Убедитесь, что бэкенд слушает на `0.0.0.0`, а не `localhost`
2. Проверьте файрвол - порт должен быть открыт для входящих соединений
3. Убедитесь, что используете правильный IP адрес (не localhost, а локальный IP)

---

## Дополнительные настройки

### Использование кастомных путей к сертификатам

Можно указать пути через переменные окружения:

```bash
HTTPS_CERT_PATH=/path/to/cert.crt HTTPS_KEY_PATH=/path/to/cert.key go run cmd/GaseProject/main.go
```

### Автоматическое определение IP адреса

Для автоматического добавления IP в сертификат можно использовать скрипт:

**Windows (PowerShell):**
```powershell
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"}).IPAddress
mkcert create-cert --domains localhost,127.0.0.1,$ip
```

**Linux/Mac:**
```bash
IP=$(hostname -I | awk '{print $1}')
mkcert create-cert --domains localhost,127.0.0.1,$IP
```

---

## Безопасность

⚠️ **НИКОГДА не публикуйте приватные ключи (`*.key` файлы) в репозиторий!**

Эти сертификаты предназначены только для локальной разработки и тестирования. Для production используйте настоящие SSL сертификаты (Let's Encrypt и т.д.).


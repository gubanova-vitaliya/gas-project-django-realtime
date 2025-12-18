/**
 * Скрипт для генерации PNG иконок из SVG
 * Требует установки sharp: npm install -D sharp
 * 
 * Использование: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Проверяем наличие sharp
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Ошибка: sharp не установлен.');
  console.log('📦 Установите sharp: npm install -D sharp');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'DefaultImage.svg');
const output192 = path.join(publicDir, 'logo192.png');
const output512 = path.join(publicDir, 'logo512.png');

// Проверяем наличие SVG
if (!fs.existsSync(svgPath)) {
  console.error(`❌ Файл не найден: ${svgPath}`);
  console.log('💡 Убедитесь, что файл DefaultImage.svg существует в папке public/');
  process.exit(1);
}

async function generateIcons() {
  try {
    console.log('🎨 Генерация иконок из SVG...');
    
    // Генерируем logo192.png
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(output192);
    console.log('✅ Создан logo192.png');
    
    // Генерируем logo512.png
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(output512);
    console.log('✅ Создан logo512.png');
    
    console.log('🎉 Иконки успешно созданы!');
    console.log('📁 Файлы находятся в папке public/');
  } catch (error) {
    console.error('❌ Ошибка при генерации иконок:', error.message);
    process.exit(1);
  }
}

generateIcons();


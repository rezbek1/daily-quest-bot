/**
 * ⚙️ КОНФИГУРАЦИЯ
 * src/config/index.js
 */

require('dotenv').config();

const config = {
  // ==================== BOT ====================
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  
  // ==================== OPENAI ====================
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // ==================== FIREBASE ====================
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  
  // ==================== ADMIN ====================
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme123',
  
  // ==================== LOGGING ====================
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // ==================== APP ====================
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
};

// Проверка обязательных переменных
const required = ['BOT_TOKEN', 'OPENAI_API_KEY', 'FIREBASE_PROJECT_ID'];
const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
  console.error('❌ Отсутствуют переменные окружения:', missing);
  console.error('Проверьте .env файл');
}

module.exports = config;

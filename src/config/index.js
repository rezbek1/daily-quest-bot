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
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  
  // ==================== LOGGING ====================
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // ==================== APP ====================
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
};

// Проверка обязательных переменных
const required = ['BOT_TOKEN', 'OPENAI_API_KEY', 'FIREBASE_PROJECT_ID', 'ADMIN_PASSWORD'];
const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
  console.error('❌ Отсутствуют переменные окружения:', missing);
  console.error('Проверьте .env файл');
}

// Debug: показать какие переменные загружены (без значений)
console.log('🔧 ENV статус:', {
  BOT_TOKEN: !!config.BOT_TOKEN,
  OPENAI_API_KEY: !!config.OPENAI_API_KEY,
  FIREBASE_PROJECT_ID: !!config.FIREBASE_PROJECT_ID,
  ADMIN_PASSWORD: !!config.ADMIN_PASSWORD,
  ADMIN_PASSWORD_LENGTH: config.ADMIN_PASSWORD?.length || 0,
});

// Railway debug: показать все переменные, содержащие ADMIN или PASSWORD
const adminVars = Object.keys(process.env).filter(key =>
  key.includes('ADMIN') || key.includes('PASSWORD')
);
console.log('🔍 Railway DEBUG - переменные с ADMIN/PASSWORD:', adminVars);
console.log('🔍 process.env.ADMIN_PASSWORD напрямую:', process.env.ADMIN_PASSWORD ? `[SET, length=${process.env.ADMIN_PASSWORD.length}]` : '[NOT SET]');

module.exports = config;

/**
 * 🌍 TIMEZONE MODULE - src/modules/timezone/index.js
 * Управление часовыми поясами (28 поясов)
 */

const handler = require('./handler');
const logger = require('../../logger');

const TIMEZONES = [
  // ЕВРОПА (9)
  'Europe/Moscow', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Athens', 'Europe/Stockholm', 'Europe/Istanbul', 'Europe/Madrid', 'Europe/Rome',
  
  // АМЕРИКА (7)
  'America/New_York', 'America/Toronto', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Sao_Paulo', 'America/Mexico_City',
  
  // АЗИЯ (10)
  'Asia/Jerusalem', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Manila',
  
  // АВСТРАЛИЯ (3)
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
  
  // АФРИКА (3)
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi',
];

/**
 * Регистрация модуля часовых поясов
 */
function register(bot) {
  handler.register(bot);
  logger.info('🌍 Модуль Timezone зарегистрирован');
}

module.exports = {
  register,
  TIMEZONES,
};

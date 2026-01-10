/**
 * 🌍 TIMEZONE/HANDLER - src/modules/timezone/handler.js
 * Обработчик выбора часового пояса
 */

const logger = require('../../logger');
const { db } = require('../../db');

/**
 * Регистрация обработчиков timezone
 * (Основная логика находится в handlers/callbacks.js)
 */
function register(bot) {
  // Обработчики timezone регистрируются в handlers/callbacks.js
  // Они используют паттерн: bot.action(/tz_(.+)/, ...)
}

/**
 * Вспомогательная функция для обработки выбора пояса
 */
async function handleTimezoneSelect(userId, timezone) {
  try {
    await db.updateUser(userId, {
      'settings.timezone': timezone,
    });
    logger.info(`✅ Часовой пояс ${timezone} установлен для ${userId}`);
    return { success: true, timezone };
  } catch (error) {
    logger.error('❌ Ошибка установки timezone:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  register,
  handleTimezoneSelect,
};

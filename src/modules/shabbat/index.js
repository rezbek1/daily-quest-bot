/**
 * 🕯️ SHABBAT MODULE - src/modules/shabbat/index.js
 * Интеграция Shabbat detection
 */

const shabbatLib = require('../../shabbat');
const logger = require('../../logger');

/**
 * Регистрация модуля Shabbat
 */
function register(bot) {
  logger.info('🕯️ Модуль Shabbat инициализирован');
  // Модуль Shabbat не требует специальной регистрации
  // Используется как утилита в reminders/sender.js
}

/**
 * Проверить находится ли пользователь в период Shabbat
 */
async function isShabbat(userId, getUser, logger) {
  return shabbatLib.isShabbat(userId, getUser, logger);
}

/**
 * Получить информацию о Shabbat для пользователя
 */
async function getShabbatInfo(userId, getUser) {
  return shabbatLib.getShabbatInfo(userId, getUser);
}

/**
 * Получить время Shabbat из Hebcal API
 */
async function fetchShabbatTimesFromHebcal(date) {
  return shabbatLib.fetchShabbatTimesFromHebcal(date);
}

module.exports = {
  register,
  isShabbat,
  getShabbatInfo,
  fetchShabbatTimesFromHebcal,
};

/**
 * 🕯️ SHABBAT UTILITIES - src/shabbat.js
 * Интеграция с Hebcal для определения периода Shabbat
 */

const axios = require('axios');
const logger = require('./logger');

const HEBCAL_API = 'https://www.hebcal.com/api/v1/holidays';

/**
 * Получить время Shabbat из Hebcal API
 */
async function fetchShabbatTimesFromHebcal(date) {
  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const response = await axios.get(HEBCAL_API, {
      params: {
        year: year,
        month: month,
        noNums: true,
      },
    });

    // Ищем Shabbat начало и конец
    const items = response.data.items || [];
    
    let shabbatStart = null;
    let shabbatEnd = null;

    for (const item of items) {
      if (item.title && item.title.includes('Candle lighting')) {
        shabbatStart = new Date(item.date);
      }
      if (item.title && item.title.includes('Havdalah')) {
        shabbatEnd = new Date(item.date);
      }
    }

    return {
      start: shabbatStart,
      end: shabbatEnd,
      isShabbat: shabbatStart && shabbatEnd,
    };
  } catch (error) {
    logger.warn('⚠️ Ошибка получения Shabbat времени:', error.message);
    return {
      start: null,
      end: null,
      isShabbat: false,
    };
  }
}

/**
 * Проверить находится ли пользователь в период Shabbat
 */
async function isShabbat(userId, getUser) {
  try {
    const user = await getUser(userId);
    if (!user) return false;

    // Если пользователь не включил Shabbat режим
    if (!user.shabbatMode) return false;

    const now = new Date();
    const shabbatInfo = await fetchShabbatTimesFromHebcal(now);

    if (!shabbatInfo.start || !shabbatInfo.end) return false;

    return now >= shabbatInfo.start && now <= shabbatInfo.end;
  } catch (error) {
    logger.warn('⚠️ Ошибка проверки Shabbat:', error.message);
    return false;
  }
}

/**
 * Получить информацию о Shabbat для пользователя
 */
async function getShabbatInfo(userId, getUser) {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const now = new Date();
    const shabbatInfo = await fetchShabbatTimesFromHebcal(now);

    return {
      enabled: user.shabbatMode || false,
      start: shabbatInfo.start,
      end: shabbatInfo.end,
      isCurrentlyShabbat: now >= shabbatInfo.start && now <= shabbatInfo.end,
    };
  } catch (error) {
    logger.warn('⚠️ Ошибка получения Shabbat инфо:', error.message);
    return null;
  }
}

module.exports = {
  isShabbat,
  getShabbatInfo,
  fetchShabbatTimesFromHebcal,
};

/**
 * 🕯️ SHABBAT UTILITIES - src/shabbat.js
 * Интеграция с Hebcal для определения периода Shabbat
 */

const axios = require('axios');
const logger = require('./logger');

// Правильный API для времени Шабата
const HEBCAL_SHABBAT_API = 'https://www.hebcal.com/shabbat';

// Geoname IDs для популярных городов
const GEONAME_IDS = {
  'Europe/Moscow': 524901,      // Москва
  'Asia/Jerusalem': 281184,     // Иерусалим
  'Asia/Tel_Aviv': 293397,      // Тель-Авив
  'Europe/Kiev': 703448,        // Киев
  'America/New_York': 5128581,  // Нью-Йорк
};

// Дефолтный город - Тель-Авив
const DEFAULT_GEONAME_ID = 293397;

/**
 * Получить время Shabbat из Hebcal API для текущей недели
 */
async function fetchShabbatTimesFromHebcal(timezone = 'Asia/Jerusalem') {
  try {
    // Определить geonameid по timezone
    const geonameid = GEONAME_IDS[timezone] || DEFAULT_GEONAME_ID;

    const response = await axios.get(HEBCAL_SHABBAT_API, {
      params: {
        cfg: 'json',
        geonameid: geonameid,
        m: 50, // Havdalah minutes after sunset
      },
      timeout: 5000,
    });

    const items = response.data.items || [];

    let shabbatStart = null;
    let shabbatEnd = null;

    for (const item of items) {
      // Candle lighting = начало Шабата (пятница вечер)
      if (item.category === 'candles') {
        shabbatStart = new Date(item.date);
      }
      // Havdalah = конец Шабата (суббота вечер)
      if (item.category === 'havdalah') {
        shabbatEnd = new Date(item.date);
      }
    }

    logger.debug(`🕯️ Shabbat times: start=${shabbatStart}, end=${shabbatEnd}`);

    return {
      start: shabbatStart,
      end: shabbatEnd,
      isValid: !!(shabbatStart && shabbatEnd),
    };
  } catch (error) {
    logger.warn('⚠️ Ошибка получения Shabbat времени:', error.message);
    return {
      start: null,
      end: null,
      isValid: false,
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
    if (!user.shabbatMode && !user.settings?.shabbatMode) return false;

    // Получить timezone пользователя
    const timezone = user.settings?.timezone || 'Asia/Jerusalem';

    const now = new Date();
    const shabbatInfo = await fetchShabbatTimesFromHebcal(timezone);

    if (!shabbatInfo.isValid) {
      logger.warn(`⚠️ Не удалось получить время Шабата для ${user.name}`);
      return false;
    }

    const inShabbat = now >= shabbatInfo.start && now <= shabbatInfo.end;

    if (inShabbat) {
      logger.info(`🕯️ ${user.name} в периоде Шабата (${shabbatInfo.start.toISOString()} - ${shabbatInfo.end.toISOString()})`);
    }

    return inShabbat;
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

    const timezone = user.settings?.timezone || 'Asia/Jerusalem';
    const now = new Date();
    const shabbatInfo = await fetchShabbatTimesFromHebcal(timezone);

    if (!shabbatInfo.isValid) {
      return null;
    }

    const isCurrentlyShabbat = now >= shabbatInfo.start && now <= shabbatInfo.end;

    // Форматируем даты для отображения
    const formatDate = (date) => {
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    };

    const formatTime = (date) => {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return {
      enabled: user.shabbatMode || user.settings?.shabbatMode || false,
      start: shabbatInfo.start,
      end: shabbatInfo.end,
      isCurrentlyShabbat,
      // Поля для команды /shabbat_info
      timezone: timezone,
      nextShabbat: formatDate(shabbatInfo.start),
      candleTime: formatTime(shabbatInfo.start),
      havdalahTime: formatTime(shabbatInfo.end),
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

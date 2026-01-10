/**
 * 🕯️ SHABBAT MODULE
 * Обнаружение периода Шабата через Hebcal API
 * Поддержка всех часовых поясов для еврейских пользователей
 */

const axios = require('axios');
const moment = require('moment-timezone');

// ==================== HEBCAL API ====================

/**
 * Получить события Шабата на конкретную дату через Hebcal API
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {object} Events с Candle lighting и Havdalah
 */
async function fetchShabbatTimesFromHebcal(date) {
  try {
    const response = await axios.get(
      'https://www.hebcal.com/api/v1/events',
      {
        params: {
          cfg: 'json',
          start: date,
          end: date,
          noHolidays: 1,
          noModern: 1,
          noMinorFast: 1,
        },
        timeout: 5000,
      }
    );

    if (!response.data || !response.data.events) {
      return null;
    }

    // Ищем события Шабата (Candle lighting и Havdalah)
    const events = response.data.events;
    const shabbatEvents = {
      candleLighting: null,
      havdalah: null,
    };

    for (const event of events) {
      if (event.title === 'Candle lighting') {
        shabbatEvents.candleLighting = {
          date: event.date,
          time: event.time || null,
        };
      }
      if (event.title === 'Havdalah') {
        shabbatEvents.havdalah = {
          date: event.date,
          time: event.time || null,
        };
      }
    }

    return shabbatEvents.candleLighting ? shabbatEvents : null;
  } catch (error) {
    console.error('❌ Hebcal API ошибка:', error.message);
    return null;
  }
}

/**
 * Рассчитать время Candle lighting по умолчанию (18 минут до захода солнца)
 * Для fallback когда Hebcal API недоступен
 * @param {moment} date - День
 * @returns {moment} Время зажигания свечей (примерно 17:00-17:30 в зависимости от сезона)
 */
function getDefaultCandleLightingTime(date) {
  const month = date.month(); // 0-11
  let hour = 17;
  let minute = 0;

  // Корректировка по сезону (примерно)
  if (month >= 4 && month <= 8) {
    // Май-сентябрь: позже
    hour = 18;
    minute = 30;
  } else if (month === 0) {
    // Январь: раньше
    hour = 17;
    minute = 0;
  }

  return date.clone().hour(hour).minute(minute).second(0);
}

/**
 * Рассчитать время Havdalah по умолчанию (около часа после захода солнца)
 * @param {moment} date - День Шабата
 * @returns {moment} Время Havdalah (примерно 18:30-19:30)
 */
function getDefaultHavdalahTime(date) {
  const month = date.month(); // 0-11
  let hour = 18;
  let minute = 30;

  // Корректировка по сезону
  if (month >= 4 && month <= 8) {
    // Май-сентябрь: позже
    hour = 20;
    minute = 0;
  } else if (month === 0) {
    // Январь: раньше
    hour = 17;
    minute = 45;
  }

  return date.clone().hour(hour).minute(minute).second(0);
}

/**
 * Проверить находится ли пользователь в периоде Шабата
 * @param {moment} userNow - Текущее время пользователя в его timezone
 * @param {object} shabbatEvents - События Shabbat (candleLighting, havdalah)
 * @returns {boolean} true если в периоде Шабата
 */
function isUserInShabbatPeriod(userNow, shabbatEvents) {
  if (!shabbatEvents) {
    return false;
  }

  // Если у нас есть точные времена
  if (shabbatEvents.candleLighting && shabbatEvents.candleLighting.time) {
    // Парсим время из формата "17:15" или похожего
    const candleTimeStr = shabbatEvents.candleLighting.time;
    const [candleHour, candleMinute] = candleTimeStr.split(':').map(Number);

    // Candle lighting обычно в пятницу вечер
    const candleDate = moment(shabbatEvents.candleLighting.date);
    const candleTime = candleDate.clone().hour(candleHour).minute(candleMinute);

    // Havdalah обычно в субботу вечер (день спустя)
    const havdalahDate = candleDate.clone().add(1, 'day');
    let havdalahTime = getDefaultHavdalahTime(havdalahDate);

    // Если есть точное время Havdalah
    if (shabbatEvents.havdalah && shabbatEvents.havdalah.time) {
      const [havdalahHour, havdalahMinute] = shabbatEvents.havdalah.time.split(':').map(Number);
      havdalahTime = havdalahDate.clone().hour(havdalahHour).minute(havdalahMinute);
    }

    // Проверить: находимся ли между Candle lighting и Havdalah
    return userNow.isSameOrAfter(candleTime) && userNow.isBefore(havdalahTime);
  }

  // Если точных времен нет - использовать defaults
  const today = userNow.clone().startOf('day');
  const dayOfWeek = today.day(); // 0=Sunday, 5=Friday, 6=Saturday

  if (dayOfWeek === 5) {
    // Пятница
    const candleTime = getDefaultCandleLightingTime(today);
    const nextDayHavdalahTime = getDefaultHavdalahTime(today.clone().add(1, 'day'));

    return userNow.isSameOrAfter(candleTime) && userNow.isBefore(nextDayHavdalahTime);
  } else if (dayOfWeek === 6) {
    // Суббота
    const candleTime = getDefaultCandleLightingTime(today.clone().subtract(1, 'day'));
    const havdalahTime = getDefaultHavdalahTime(today);

    return userNow.isSameOrAfter(candleTime) && userNow.isBefore(havdalahTime);
  }

  return false;
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ: Проверить находится ли пользователь в Шабат
 * @param {string} userId - ID пользователя
 * @param {function} getUser - Функция для получения данных пользователя
 * @param {object} logger - Winston logger
 * @returns {boolean} true если это Шабат для пользователя
 */
async function isShabbat(userId, getUser, logger) {
  try {
    // 1. Получить пользователя и его timezone
    const user = await getUser(userId);
    if (!user) {
      return false;
    }

    const timezone = user.settings?.timezone || 'Europe/Moscow';
    const userNow = moment().tz(timezone);

    // 2. Логирование для отладки
    logger.debug(`🕯️ Проверка Шабата для ${user.name} (${timezone}): ${userNow.format('YYYY-MM-DD HH:mm:ss')}`);

    // 3. Попытка получить события от Hebcal API
    const dateStr = userNow.format('YYYY-MM-DD');
    const shabbatEvents = await fetchShabbatTimesFromHebcal(dateStr);

    // 4. Проверить находимся ли в периоде Шабата
    const inShabbat = isUserInShabbatPeriod(userNow, shabbatEvents);

    if (inShabbat) {
      logger.info(`🕯️ ШАБАТ АКТИВЕН для ${user.name} (${timezone}) - напоминание ПРОПУЩЕНО`);
      return true;
    }

    logger.debug(`✅ Не Шабат для ${user.name} - напоминание будет отправлено`);
    return false;
  } catch (error) {
    // Если ошибка - не блокируем отправку напоминания
    logger.warn(`⚠️ Ошибка проверки Шабата для ${userId}: ${error.message}`);
    return false;
  }
}

/**
 * Получить информацию о Шабате для пользователя (для display)
 * @param {string} userId
 * @param {function} getUser
 * @returns {object} Информация о Шабате
 */
async function getShabbatInfo(userId, getUser) {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const timezone = user.settings?.timezone || 'Europe/Moscow';
    const userNow = moment().tz(timezone);
    const dateStr = userNow.format('YYYY-MM-DD');

    const shabbatEvents = await fetchShabbatTimesFromHebcal(dateStr);

    if (!shabbatEvents || !shabbatEvents.candleLighting) {
      return null;
    }

    const candleDate = moment(shabbatEvents.candleLighting.date);
    let candleTime = getDefaultCandleLightingTime(candleDate);

    if (shabbatEvents.candleLighting.time) {
      const [hour, minute] = shabbatEvents.candleLighting.time.split(':').map(Number);
      candleTime = candleDate.clone().hour(hour).minute(minute);
    }

    const havdalahDate = candleDate.clone().add(1, 'day');
    let havdalahTime = getDefaultHavdalahTime(havdalahDate);

    if (shabbatEvents.havdalah && shabbatEvents.havdalah.time) {
      const [hour, minute] = shabbatEvents.havdalah.time.split(':').map(Number);
      havdalahTime = havdalahDate.clone().hour(hour).minute(minute);
    }

    return {
      candleTime: candleTime.format('HH:mm'),
      havdalahTime: havdalahTime.format('HH:mm'),
      nextShabbat: candleDate.format('dddd, DD MMMM'),
      timezone: timezone,
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  isShabbat,
  fetchShabbatTimesFromHebcal,
  isUserInShabbatPeriod,
  getShabbatInfo,
};

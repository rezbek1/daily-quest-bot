/**
 * ⌨️ KEYBOARD/TIMEZONE - src/modules/keyboard/timezone.js
 * Клавиатура для выбора часовых поясов
 */

const { Markup } = require('telegraf');
const { TIMEZONES } = require('../timezone');

/**
 * Получить клавиатуру часовых поясов
 */
function getTzKeyboard() {
  return Markup.inlineKeyboard(
    TIMEZONES.map(tz => [Markup.button.callback(tz, `tz_${tz}`)]),
    { columns: 2 }
  );
}

module.exports = { getTzKeyboard };

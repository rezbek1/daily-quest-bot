/**
 * ⌨️ KEYBOARD/TIMEZONE - src/modules/keyboard/timezone.js
 * Клавиатура для выбора часовых поясов
 */

const { Markup } = require('telegraf');

/**
 * Получить клавиатуру часовых поясов
 */
function getTzKeyboard(TIMEZONES) {
  return Markup.inlineKeyboard(
    TIMEZONES.map(tz => [Markup.button.callback(tz, `tz_${tz}`)]),
    { columns: 2 }
  );
}

module.exports = { getTzKeyboard };

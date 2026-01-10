/**
 * ⌨️ MAIN KEYBOARD - keyboard/main.js
 */

const { Markup } = require('telegraf');

function getMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📝 Добавить', 'menu_add'),
      Markup.button.callback('📋 Квесты', 'menu_quests'),
      Markup.button.callback('👤 Профиль', 'menu_profile'),
    ],
    [
      Markup.button.callback('📈 Статистика', 'menu_stats'),
      Markup.button.callback('🏆 Лидерборд', 'menu_leaderboard'),
      Markup.button.callback('❓ Помощь', 'menu_help'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu_settings'),
      Markup.button.callback('🏠 На главную', 'menu_home'),
    ],
  ]);
}

module.exports = { getMainMenuKeyboard };

---

/**
 * ⌨️ TIMEZONE KEYBOARD - keyboard/timezone.js
 */

const { Markup } = require('telegraf');

function getTzKeyboard(TIMEZONES) {
  return Markup.inlineKeyboard(
    TIMEZONES.map(tz => [Markup.button.callback(tz, `tz_${tz}`)]),
    { columns: 2 }
  );
}

module.exports = { getTzKeyboard };

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

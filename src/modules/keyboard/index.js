/**
 * ⌨️ KEYBOARD MODULE - keyboard/index.js
 * Экспорт всех клавиатур
 */

const main = require('./main');
const admin = require('./admin');
const timezone = require('./timezone');

module.exports = {
  getMainMenuKeyboard: main.getMainMenuKeyboard,
  getAdminKeyboard: admin.getAdminKeyboard,
  getBackToAdminKeyboard: admin.getBackToAdminKeyboard,
  getTzKeyboard: timezone.getTzKeyboard,
};

---

/**
 * ⌨️ MAIN KEYBOARD - keyboard/main.js
 * Главное меню (все остальные меню через actions)
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
 * Меню выбора часового пояса
 */

const { Markup } = require('telegraf');
const { TIMEZONES } = require('../timezone');

function getTzKeyboard() {
  return Markup.inlineKeyboard(
    TIMEZONES.map(tz => [Markup.button.callback(tz, `tz_${tz}`)]),
    { columns: 2 }
  );
}

module.exports = { getTzKeyboard };

---

/**
 * ⌨️ ADMIN KEYBOARD - keyboard/admin.js
 * (уже создан в admin/keyboards.js, здесь может быть alias)
 */

const adminKb = require('../admin/keyboards');

module.exports = {
  getAdminKeyboard: adminKb.getAdminKeyboard,
  getBackToAdminKeyboard: adminKb.getBackToAdminKeyboard,
};

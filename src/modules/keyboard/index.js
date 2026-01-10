/**
 * ⌨️ KEYBOARD MODULE - keyboard/index.js
 * Экспорт всех клавиатур
 */

const main = require('./main');
const timezone = require('./timezone');

// Проверяем есть ли admin/keyboards.js
let admin = {};
try {
  admin = require('../admin/keyboards');
} catch (e) {
  // admin/keyboards не найден - создадим пустой объект
  admin = {
    getAdminKeyboard: () => ({}),
    getBackToAdminKeyboard: () => ({}),
  };
}

module.exports = {
  getMainMenuKeyboard: main.getMainMenuKeyboard,
  getAdminKeyboard: admin.getAdminKeyboard || (() => ({})),
  getBackToAdminKeyboard: admin.getBackToAdminKeyboard || (() => ({})),
  getTzKeyboard: timezone.getTzKeyboard,
};

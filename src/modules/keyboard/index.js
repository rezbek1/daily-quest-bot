/**
 * ⌨️ KEYBOARD MODULE - keyboard/index.js
 * Экспорт всех клавиатур
 */

const logger = require('../../logger');
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

/**
 * Регистрация модуля Keyboard
 */
function register(bot) {
  logger.info('⌨️ Модуль Keyboard инициализирован');
  // Модуль Keyboard не требует специальной регистрации
  // Используется как утилита в других модулях
}

module.exports = {
  register,
  getMainMenuKeyboard: main.getMainMenuKeyboard,
  getAdminKeyboard: admin.getAdminKeyboard || (() => ({})),
  getBackToAdminKeyboard: admin.getBackToAdminKeyboard || (() => ({})),
  getTzKeyboard: timezone.getTzKeyboard,
};

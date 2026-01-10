/**
 * 👤 USERS MODULE - src/modules/users/index.js
 * Управление пользователями
 */

const creator = require('./creator');
const getter = require('./getter');
const logger = require('../../logger');

/**
 * Регистрация модуля users
 */
function register(bot) {
  logger.info('👤 Модуль Users зарегистрирован');
  // Модуль users не требует специальной регистрации
  // Используется как утилита другими модулями
}

module.exports = {
  register,
  createOrUpdateUser: creator.createOrUpdateUser,
  getUser: getter.getUser,
};

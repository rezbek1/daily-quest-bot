/**
 * 🔔 REMINDERS MODULE - src/modules/reminders/index.js
 * Планировщик напоминаний
 */

const sender = require('./sender');
const logger = require('../../logger');

/**
 * Регистрация модуля напоминаний
 */
function register(bot) {
  sender.register(bot);
  logger.info('🔔 Модуль напоминаний зарегистрирован');
}

/**
 * Запустить планировщик
 */
function start() {
  logger.info('🚀 Запускаю планировщик напоминаний...');
  sender.startScheduler();
}

/**
 * Остановить планировщик
 */
function stop() {
  logger.info('⏸️ Останавливаю планировщик...');
  sender.stopScheduler();
}

module.exports = {
  register,
  start,
  stop,
};

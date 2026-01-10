/**
 * 🔐 ADMIN MODULE
 * Администраторская панель
 */

const adminCommands = require('./commands');
const adminHandlers = require('./handlers');
const adminKeyboards = require('./keyboards');

/**
 * Регистрация админ модуля
 */
function register(bot) {
  console.log('📋 Регистрирую Admin модуль...');
  
  // Регистрируем команды
  adminCommands.register(bot);
  
  // Регистрируем обработчики
  adminHandlers.register(bot);
  
  console.log('✅ Admin модуль зарегистрирован');
}

module.exports = {
  register,
  keyboards: adminKeyboards,
};

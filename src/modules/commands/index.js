/**
 * 📝 COMMANDS MODULE
 * Основные команды пользователя
 */

const basicCommands = require('./basic');
const questCommands = require('./quests');
const profileCommands = require('./profile');
const reminderCommands = require('./reminders');
const feedbackCommands = require('./feedback');

/**
 * Регистрация всех команд
 */
function register(bot) {
  console.log('📝 Регистрирую Commands модуль...');
  
  basicCommands.register(bot);
  questCommands.register(bot);
  profileCommands.register(bot);
  reminderCommands.register(bot);
  feedbackCommands.register(bot);
  
  console.log('✅ Commands модуль зарегистрирован');
}

module.exports = {
  register,
};

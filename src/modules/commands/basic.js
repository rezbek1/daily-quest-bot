/**
 * 📝 BASIC COMMANDS
 * /start, /help, /test, /cancel
 */

const logger = require('../../logger');
const { getMainMenuKeyboard } = require('../keyboard');
const { createOrUpdateUser, getUser } = require('../users');

/**
 * Регистрация основных команд
 */
function register(bot) {
  bot.start(handleStart);
  bot.command('help', handleHelp);
  bot.command('test', handleTest);
  bot.command('cancel', handleCancel);
}

/**
 * /start
 */
async function handleStart(ctx) {
  const userId = ctx.from.id;
  
  try {
    await createOrUpdateUser(userId, ctx.from);
    
    const welcomeMessage = `🖤 TELEGRAM-БОТ ВЫЖИВАНИЯ ДЛЯ ПРЕДПРИНИМАТЕЛЯ
    
Telegram-бот, который превращает предпринимательскую рутину в черную комедию.
    
Ты строишь бизнес, а ощущаешь, что строишь себе нервный срыв?`;
    
    await ctx.reply(welcomeMessage, getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка /start:', error);
    await ctx.reply('❌ Ошибка инициализации бота');
  }
}

/**
 * /help
 */
async function handleHelp(ctx) {
  const helpMessage = `❓ СПРАВКА ПО КОМАНДАМ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 УПРАВЛЕНИЕ КВЕСТАМИ:
/addtask [описание] — создать квест
/quests — все квесты
/today — квесты на сегодня

👤 ПРОФИЛЬ И ПРОГРЕСС:
/profile — профиль
/stats — статистика`;
  
  await ctx.reply(helpMessage, getMainMenuKeyboard());
}

/**
 * /test
 */
async function handleTest(ctx) {
  logger.info('🧪 КОМАНДА /TEST');
  await ctx.reply('✅ БОТ РАБОТАЕТ!');
}

/**
 * /cancel
 */
async function handleCancel(ctx) {
  await ctx.reply('✅ Операция отменена', getMainMenuKeyboard());
}

module.exports = {
  register,
};

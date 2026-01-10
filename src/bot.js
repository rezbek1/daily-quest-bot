/**
 * 🖤 ПОВСЕДНЕВНЫЙ КВЕСТ - Telegram Bot
 * Главный файл (МОДУЛЬНАЯ ВЕРСИЯ)
 */

const { Telegraf, session } = require('telegraf');
const logger = require('./logger');
const config = require('./config');

console.log('🚀 Запускаю ПОВСЕДНЕВНЫЙ КВЕСТ...');

// ==================== ИНИЦИАЛИЗАЦИЯ БОТА ====================

const bot = new Telegraf(config.BOT_TOKEN);
bot.use(session());

logger.info('🤖 Бот инициализирован');

// ==================== РЕГИСТРАЦИЯ МОДУЛЕЙ ====================

// Импортируем модули
const adminModule = require('./modules/admin');
const commandsModule = require('./modules/commands');
const remindersModule = require('./modules/reminders');
const timezoneModule = require('./modules/timezone');
const shabatModule = require('./modules/shabbat');
const questsModule = require('./modules/quests');
const keyboardModule = require('./modules/keyboard');
const handlersModule = require('./modules/handlers');
const usersModule = require('./modules/users');

// Регистрируем все модули
try {
  usersModule.register(bot);
  questsModule.register(bot);
  keyboardModule.register(bot);
  commandsModule.register(bot);
  remindersModule.register(bot);
  timezoneModule.register(bot);
  shabatModule.register(bot);
  handlersModule.register(bot);
  adminModule.register(bot);
  
  logger.info('✅ Все модули зарегистрированы');
} catch (error) {
  logger.error('❌ Ошибка регистрации модулей:', error);
  process.exit(1);
}

// ==================== ЗАПУСК ПЛАНИРОВЩИКА ====================

try {
  logger.info('⏳ Запускаю планировщик напоминаний...');
  remindersModule.start();
  logger.info('✅ Планировщик запущен!');
} catch (error) {
  logger.error('❌ Ошибка запуска планировщика:', error);
}

// ==================== ОБРАБОТКА ОШИБОК ====================

bot.catch((err, ctx) => {
  logger.error('❌ Ошибка бота:', err);
  try {
    const { getMainMenuKeyboard } = require('./modules/keyboard');
    ctx.reply('❌ Произошла ошибка. Попробуй позже.', getMainMenuKeyboard());
  } catch (e) {
    logger.error('❌ Ошибка отправки ошибки:', e);
  }
});

// ==================== ЗАПУСК ====================

const startBot = async () => {
  try {
    logger.info('⏳ Начинаю запуск бота...');
    
    // Получить информацию о боте
    const me = await bot.telegram.getMe();
    logger.info(`🔗 https://t.me/${me.username}`);
    logger.info('🚀 Бот запущен и готов к работе!');
    
    // Запускаем бот
    await bot.launch();
    
  } catch (error) {
    logger.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
};

startBot();

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGINT', () => {
  logger.info('📴 Завершение работы (SIGINT)...');
  remindersModule.stop();
  bot.stop('SIGINT');
});

process.on('SIGTERM', () => {
  logger.info('📴 Завершение работы (SIGTERM)...');
  remindersModule.stop();
  bot.stop('SIGTERM');
});

module.exports = bot;

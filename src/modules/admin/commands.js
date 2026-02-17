/**
 * 🔐 ADMIN COMMANDS - src/modules/admin/commands.js
 * /admin_login, /admin, /admin_logout
 */

const logger = require('../../logger');
const config = require('../../config');
const { getAdminKeyboard } = require('./keyboards');
const { getMainMenuKeyboard } = require('../keyboard');

/**
 * Регистрация команд администратора
 */
function register(bot) {
  bot.command('admin_login', handleAdminLogin);
  bot.command('admin', handleAdminMenu);
  bot.command('admin_logout', handleAdminLogout);
}

/**
 * /admin_login [пароль] - Вход в админ-панель
 */
async function handleAdminLogin(ctx) {
  try {
    const userId = ctx.from.id;
    logger.info(`🔐 Попытка входа админа от ${userId}`);

    const password = ctx.message.text.split(' ').slice(1).join(' ').trim();
    logger.info(`🔐 Введённый пароль: "${password}", ожидаемый: "${config.ADMIN_PASSWORD}"`);

    if (!password) {
      await ctx.reply('🔐 Использование: /admin_login [пароль]');
      return;
    }

    if (password !== config.ADMIN_PASSWORD) {
      logger.warn(`❌ НЕУДАЧНАЯ попытка входа администратора от ${userId}`);
      await ctx.reply('❌ Неправильный пароль!', getMainMenuKeyboard());
      return;
    }

    // Установить флаг админа в session
    ctx.session = ctx.session || {};
    ctx.session.isAdmin = true;
    ctx.session.adminLoginTime = new Date();

    logger.info(`✅ Администратор ${userId} успешно вошел`);
    await ctx.reply('✅ Вы вошли как администратор!', getAdminKeyboard());
  } catch (error) {
    logger.error(`❌ Ошибка в handleAdminLogin:`, error);
    await ctx.reply('❌ Произошла ошибка при входе');
  }
}

/**
 * /admin - Главное меню администратора
 */
async function handleAdminMenu(ctx) {
  ctx.session = ctx.session || {};
  
  if (!ctx.session.isAdmin) {
    await ctx.reply('❌ Ты не администратор. Используй /admin_login [пароль]', getMainMenuKeyboard());
    return;
  }

  await ctx.reply('🔐 АДМИН-ПАНЕЛЬ', getAdminKeyboard());
}

/**
 * /admin_logout - Выход из админ-панели
 */
async function handleAdminLogout(ctx) {
  ctx.session = ctx.session || {};
  
  if (!ctx.session.isAdmin) {
    await ctx.reply('❌ Ты не в админ-панели', getMainMenuKeyboard());
    return;
  }

  ctx.session.isAdmin = false;
  logger.info(`✅ Администратор ${ctx.from.id} вышел`);
  await ctx.reply('👋 Вы вышли из админ-панели', getMainMenuKeyboard());
}

module.exports = {
  register,
};


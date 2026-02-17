/**
 * ADMIN COMMANDS - src/modules/admin/commands.js
 * /admin, /admin_logout, /admin_add, /admin_remove, /admin_list
 */

const logger = require('../../logger');
const config = require('../../config');
const { db } = require('../../db');
const { getAdminKeyboard } = require('./keyboards');
const { getMainMenuKeyboard } = require('../keyboard');

/**
 * Регистрация команд администратора
 */
function register(bot) {
  bot.command('admin', handleAdmin);
  bot.command('admin_logout', handleAdminLogout);
  bot.command('admin_add', handleAdminAdd);
  bot.command('admin_remove', handleAdminRemove);
  bot.command('admin_list', handleAdminList);

  // Оставляем для обратной совместимости (редирект на /admin)
  bot.command('admin_login', handleAdmin);
}

/**
 * Проверка супер-админа
 */
function isSuperAdmin(userId) {
  return userId === config.SUPER_ADMIN_ID ||
         userId.toString() === config.SUPER_ADMIN_ID.toString();
}

/**
 * /admin - Вход в админ-панель (по Telegram ID)
 */
async function handleAdmin(ctx) {
  try {
    const userId = ctx.from.id;
    logger.info(`Попытка входа админа от ${userId}`);

    // Проверяем права
    const hasAccess = await db.isAdmin(userId);

    if (!hasAccess) {
      logger.warn(`Отказано в доступе для ${userId}`);
      await ctx.reply('У тебя нет доступа к админ-панели', getMainMenuKeyboard());
      return;
    }

    // Установить флаг админа в session
    ctx.session = ctx.session || {};
    ctx.session.isAdmin = true;
    ctx.session.isSuperAdmin = isSuperAdmin(userId);
    ctx.session.adminLoginTime = new Date();

    const adminType = ctx.session.isSuperAdmin ? 'Супер-админ' : 'Админ';
    logger.info(`${adminType} ${userId} успешно вошёл`);

    await ctx.reply(`${adminType}: добро пожаловать!`, getAdminKeyboard());
  } catch (error) {
    logger.error(`Ошибка в handleAdmin:`, error);
    await ctx.reply('Произошла ошибка');
  }
}

/**
 * /admin_logout - Выход из админ-панели
 */
async function handleAdminLogout(ctx) {
  ctx.session = ctx.session || {};

  if (!ctx.session.isAdmin) {
    await ctx.reply('Ты не в админ-панели', getMainMenuKeyboard());
    return;
  }

  ctx.session.isAdmin = false;
  ctx.session.isSuperAdmin = false;
  logger.info(`Администратор ${ctx.from.id} вышел`);
  await ctx.reply('Вы вышли из админ-панели', getMainMenuKeyboard());
}

/**
 * /admin_add [ID] - Добавить админа (только для супер-админа)
 */
async function handleAdminAdd(ctx) {
  try {
    const userId = ctx.from.id;

    // Только супер-админ может добавлять других админов
    if (!isSuperAdmin(userId)) {
      await ctx.reply('Только супер-админ может добавлять админов');
      return;
    }

    const args = ctx.message.text.split(' ').slice(1);
    const newAdminId = args[0];

    if (!newAdminId || isNaN(newAdminId)) {
      await ctx.reply('Использование: /admin_add [Telegram ID]\n\nПример: /admin_add 123456789');
      return;
    }

    // Проверка - не супер-админ ли это
    if (isSuperAdmin(parseInt(newAdminId))) {
      await ctx.reply('Этот пользователь уже супер-админ');
      return;
    }

    // Добавляем админа
    const success = await db.addAdmin(newAdminId, userId);

    if (success) {
      await ctx.reply(`Админ ${newAdminId} добавлен`);
    } else {
      await ctx.reply('Ошибка добавления админа');
    }
  } catch (error) {
    logger.error('Ошибка в handleAdminAdd:', error);
    await ctx.reply('Произошла ошибка');
  }
}

/**
 * /admin_remove [ID] - Удалить админа (только для супер-админа)
 */
async function handleAdminRemove(ctx) {
  try {
    const userId = ctx.from.id;

    // Только супер-админ может удалять админов
    if (!isSuperAdmin(userId)) {
      await ctx.reply('Только супер-админ может удалять админов');
      return;
    }

    const args = ctx.message.text.split(' ').slice(1);
    const adminIdToRemove = args[0];

    if (!adminIdToRemove || isNaN(adminIdToRemove)) {
      await ctx.reply('Использование: /admin_remove [Telegram ID]\n\nПример: /admin_remove 123456789');
      return;
    }

    // Нельзя удалить супер-админа
    if (isSuperAdmin(parseInt(adminIdToRemove))) {
      await ctx.reply('Нельзя удалить супер-админа');
      return;
    }

    // Удаляем админа
    const success = await db.removeAdmin(adminIdToRemove);

    if (success) {
      await ctx.reply(`Админ ${adminIdToRemove} удалён`);
    } else {
      await ctx.reply('Ошибка удаления админа');
    }
  } catch (error) {
    logger.error('Ошибка в handleAdminRemove:', error);
    await ctx.reply('Произошла ошибка');
  }
}

/**
 * /admin_list - Список всех админов
 */
async function handleAdminList(ctx) {
  try {
    const userId = ctx.from.id;

    // Проверяем права
    const hasAccess = await db.isAdmin(userId);

    if (!hasAccess) {
      await ctx.reply('У тебя нет доступа');
      return;
    }

    // Получаем список админов из базы
    const admins = await db.getAdmins();

    let message = 'СПИСОК АДМИНОВ\n';
    message += '━━━━━━━━━━━━━━━━━━━━\n\n';
    message += `Супер-админ: ${config.SUPER_ADMIN_ID}\n\n`;

    if (admins.length > 0) {
      message += 'Админы из базы:\n';
      admins.forEach((admin, i) => {
        message += `${i + 1}. ${admin.userId}\n`;
      });
    } else {
      message += 'Дополнительных админов нет';
    }

    await ctx.reply(message);
  } catch (error) {
    logger.error('Ошибка в handleAdminList:', error);
    await ctx.reply('Произошла ошибка');
  }
}

module.exports = {
  register,
};

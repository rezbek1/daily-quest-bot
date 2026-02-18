/**
 * 🎯 HANDLERS/TEXT - src/modules/handlers/text.js
 * bot.on('text') обработчик
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { getMainMenuKeyboard } = require('../keyboard');
const { createQuest } = require('../quests');
const { createOrUpdateUser, getUser } = require('../users');

/**
 * Регистрация обработчика текста
 */
function register(bot) {
  bot.on('text', handleText);
}

/**
 * Обработка всех текстовых сообщений
 */
async function handleText(ctx, next) {
  ctx.session = ctx.session || {};
  const userId = ctx.from.id;
  const text = ctx.message.text;

  // Обработка отмены
  if (text === '❌ Отмена') {
    ctx.session.waitingForTask = false;
    await ctx.reply('❌ Отменено', getMainMenuKeyboard());
    return;
  }

  // Если в режиме ввода задачи
  if (ctx.session.waitingForTask) {
    const taskDescription = text.trim();
    
    if (!taskDescription || taskDescription.length < 3) {
      await ctx.reply('⚠️ Описание задачи должно быть минимум 3 символа');
      return;
    }
    
    ctx.session.waitingForTask = false;
    
    // Создать/обновить пользователя
    const isNewUser = await createOrUpdateUser(userId, ctx.from);
    
    if (isNewUser) {
      await ctx.reply('👋 Добро пожаловать в БИЗНЕС-СИМУЛЯТОР ВЫЖИВАНИЯ!', getMainMenuKeyboard());
    }
    
    const waitMsg = await ctx.reply('⏳ Генерирую сюжет...', getMainMenuKeyboard());
    
    const quest = await createQuest(userId, taskDescription);
    if (!quest) {
      await ctx.reply('❌ Ошибка создания квеста', getMainMenuKeyboard());
      return;
    }
    
    const questMessage = `✨ НОВЫЙ КВЕСТ #${quest.questNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${quest.title}

${quest.story}

⭐ +${quest.xp} XP за выживание`;
    
    const { Markup } = require('telegraf');
    const questKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${quest.id}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${quest.id}`)],
      ...getMainMenuKeyboard().reply_markup.inline_keyboard,
    ]);
    
    await ctx.reply(questMessage, questKeyboard);
    
    try {
      await ctx.deleteMessage(waitMsg.message_id);
    } catch (e) {}
    
    return;
  }

  // Проверить режимы для админов (добавление/удаление админа)
  if (ctx.session.waitingForAdminAdd) {
    ctx.session.waitingForAdminAdd = false;
    const newAdminId = text.trim();

    if (!newAdminId || isNaN(newAdminId)) {
      await ctx.reply('Неверный ID. Введи числовой Telegram ID.', getMainMenuKeyboard());
      return;
    }

    const success = await db.addAdmin(newAdminId, userId);
    if (success) {
      await ctx.reply(`Админ ${newAdminId} добавлен`);
    } else {
      await ctx.reply('Ошибка добавления админа');
    }
    return;
  }

  if (ctx.session.waitingForAdminRemove) {
    ctx.session.waitingForAdminRemove = false;
    const adminIdToRemove = text.trim();

    if (!adminIdToRemove || isNaN(adminIdToRemove)) {
      await ctx.reply('Неверный ID. Введи числовой Telegram ID.', getMainMenuKeyboard());
      return;
    }

    const success = await db.removeAdmin(adminIdToRemove);
    if (success) {
      await ctx.reply(`Админ ${adminIdToRemove} удалён`);
    } else {
      await ctx.reply('Ошибка удаления админа');
    }
    return;
  }

  // Проверить режимы broadcast для админов
  const userDoc = await db.getUser(userId);
  if (userDoc) {
    // Если админ ждёт ввода текста для broadcast
    if (userDoc.waitingForBroadcastText) {
      // Обработка broadcast текста
      // Это обрабатывается в admin/handlers.js
      return next();
    }
  }

  // Если это команда - передать дальше в цепочку обработчиков
  if (text.startsWith('/')) {
    return next();
  }

  // Обычная обработка неправильных сообщений
  await ctx.reply(
    '❌ Используй кнопки меню или /help',
    getMainMenuKeyboard()
  );
}

module.exports = { register };

/**
 * 🎯 HANDLERS/TEXT - src/modules/handlers/text.js
 * bot.on('text') обработчик
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { getMainMenuKeyboard } = require('../keyboard');
const { createQuest } = require('../quests');
const { createOrUpdateUser, getUser } = require('../users');
const { esc } = require('../../utils/format');

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
    
    const painStr = quest.painLevel ? `🔥 Уровень боли: <b>${quest.painLevel}/10</b>\n` : '';
    const questMessage = `✨ <b>НОВЫЙ КВЕСТ #${quest.questNumber}</b>
<i>${esc(quest.title)}</i>

${esc(quest.story)}

🏆 <b>+${quest.xp} XP</b>  ${painStr}
⏰ <b>Выбери дедлайн:</b>`;

    const { Markup } = require('telegraf');
    const questKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Сегодня', `deadline_today_${quest.id}`),
        Markup.button.callback('Завтра', `deadline_tomorrow_${quest.id}`),
      ],
      [
        Markup.button.callback('Через 3 дня', `deadline_3days_${quest.id}`),
        Markup.button.callback('Через неделю', `deadline_week_${quest.id}`),
      ],
      [Markup.button.callback('Без дедлайна', `deadline_none_${quest.id}`)],
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${quest.id}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${quest.id}`)],
    ]);

    await ctx.reply(questMessage, { parse_mode: 'HTML', ...questKeyboard });
    
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

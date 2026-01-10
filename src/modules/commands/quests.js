/**
 * 📝 COMMANDS/QUESTS - src/modules/commands/quests.js
 * /addtask, /quests, /today
 */

const logger = require('../../logger');
const { createQuest, getActiveQuests, getTodayQuests } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');

/**
 * Регистрация команд квестов
 */
function register(bot) {
  bot.command('addtask', handleAddTask);
  bot.command('quests', handleQuests);
  bot.command('today', handleToday);
}

/**
 * /addtask [описание] - Создать квест
 */
async function handleAddTask(ctx) {
  const userId = ctx.from.id;
  const taskDescription = ctx.message.text.replace('/addtask ', '').trim();

  if (!taskDescription) {
    await ctx.reply('📝 Использование: /addtask Твоя задача\n\nПример: /addtask позвонить клиенту', getMainMenuKeyboard());
    return;
  }

  try {
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
    
  } catch (error) {
    logger.error('❌ Ошибка /addtask:', error);
    await ctx.reply('❌ Ошибка при создании квеста', getMainMenuKeyboard());
  }
}

/**
 * /quests - Показать все активные квесты
 */
async function handleQuests(ctx) {
  const userId = ctx.from.id;
  
  try {
    const quests = await getActiveQuests(userId);

    if (!quests || quests.length === 0) {
      await ctx.reply('📭 У тебя нет активных квестов\n\n💡 Создай новый: /addtask', getMainMenuKeyboard());
      return;
    }

    let message = `📋 АКТИВНЫЕ КВЕСТЫ (${quests.length})\n`;
    message += `${'━'.repeat(40)}\n\n`;

    for (const quest of quests) {
      const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
      message += `#${quest.questNumber} 💀 ${quest.title}\n`;
      message += `${difficulty} +${quest.xp} XP\n\n`;
    }

    const { Markup } = require('telegraf');
    const buttons = quests.map((quest) => [
      Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
      Markup.button.callback(`🗑️ #${quest.questNumber}`, `delete_${quest.id}`),
    ]);

    const keyboard = Markup.inlineKeyboard([
      ...buttons,
      ...getMainMenuKeyboard().reply_markup.inline_keyboard,
    ]);

    await ctx.reply(message, keyboard);
  } catch (error) {
    logger.error('❌ Ошибка /quests:', error);
    await ctx.reply('❌ Ошибка загрузки квестов', getMainMenuKeyboard());
  }
}

/**
 * /today - Показать квесты на сегодня
 */
async function handleToday(ctx) {
  const userId = ctx.from.id;
  
  try {
    const todayQuests = await getTodayQuests(userId);

    if (!todayQuests || todayQuests.length === 0) {
      await ctx.reply('📭 Нет квестов на сегодня\n\n💡 Создай новый: /addtask', getMainMenuKeyboard());
      return;
    }

    let message = `📋 КВЕСТЫ НА СЕГОДНЯ (${todayQuests.length})\n`;
    message += `${'━'.repeat(40)}\n\n`;

    for (const quest of todayQuests) {
      message += `#${quest.questNumber} ${quest.title}\n`;
      message += `+${quest.xp} XP\n\n`;
    }

    const { Markup } = require('telegraf');
    const buttons = todayQuests.map((quest) => [
      Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
    ]);

    const keyboard = Markup.inlineKeyboard([
      ...buttons,
      ...getMainMenuKeyboard().reply_markup.inline_keyboard,
    ]);

    await ctx.reply(message, keyboard);
  } catch (error) {
    logger.error('❌ Ошибка /today:', error);
    await ctx.reply('❌ Ошибка загрузки квестов', getMainMenuKeyboard());
  }
}

module.exports = {
  register,
};

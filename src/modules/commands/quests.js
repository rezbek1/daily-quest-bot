/**
 * 📝 COMMANDS/QUESTS - src/modules/commands/quests.js
 * /addtask, /quests, /today
 */

const logger = require('../../logger');
const { createQuest, getActiveQuests, getTodayQuests } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');
const { esc } = require('../../utils/format');

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

    const questMessage = `✨ <b>НОВЫЙ КВЕСТ #${quest.questNumber}</b>

📜 <b>${esc(quest.title)}</b>

${esc(quest.story)}

⭐ <b>+${quest.xp} XP</b> за выживание`;
    
    const { Markup } = require('telegraf');
    const questKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${quest.id}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${quest.id}`)],
      ...getMainMenuKeyboard().reply_markup.inline_keyboard,
    ]);
    
    await ctx.reply(questMessage, { parse_mode: 'HTML', ...questKeyboard });
    
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

    let message = `📋 <b>АКТИВНЫЕ КВЕСТЫ (${quests.length})</b>\n\n`;

    for (const quest of quests) {
      const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
      const deadlineStr = quest.deadline
        ? `\n📅 <i>до ${new Date(quest.deadline?.toDate ? quest.deadline.toDate() : quest.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</i>`
        : '';
      message += `#${quest.questNumber} 💀 <b>${esc(quest.title)}</b>${deadlineStr}\n`;
      message += `${difficulty || '⭐'} <b>+${quest.xp} XP</b>\n\n`;
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

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
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

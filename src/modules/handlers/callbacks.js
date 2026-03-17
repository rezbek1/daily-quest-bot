/**
 * 🎯 HANDLERS/CALLBACKS - src/modules/handlers/callbacks.js
 * Выполнение, удаление квестов, выбор часовых поясов
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { completeQuest } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');
const { TIMEZONES } = require('../timezone');
const { esc, progressBar } = require('../../utils/format');

/**
 * Регистрация callback обработчиков
 */
function register(bot) {
  // Выполнить квест
  bot.action(/done_(.+)/, handleQuestComplete);

  // Удалить квест
  bot.action(/delete_(.+)/, handleQuestDelete);

  // Дедлайны
  bot.action(/deadline_today_(.+)/, (ctx) => handleDeadline(ctx, 'today'));
  bot.action(/deadline_tomorrow_(.+)/, (ctx) => handleDeadline(ctx, 'tomorrow'));
  bot.action(/deadline_3days_(.+)/, (ctx) => handleDeadline(ctx, '3days'));
  bot.action(/deadline_week_(.+)/, (ctx) => handleDeadline(ctx, 'week'));
  bot.action(/deadline_none_(.+)/, (ctx) => handleDeadline(ctx, 'none'));

  // Выбрать часовой пояс
  TIMEZONES.forEach(tz => {
    bot.action(`tz_${tz}`, (ctx) => handleTimezoneSelect(ctx, tz));
  });
}

/**
 * ✅ Выполнить квест
 */
async function handleQuestComplete(ctx) {
  const questId = ctx.match[1];
  const userId = ctx.from.id;
  
  try {
    const result = await completeQuest(userId, questId);

    if (!result.success) {
      await ctx.answerCbQuery(`❌ ${result.error}`, true);
      return;
    }

    const streakEmoji = result.newStreak >= 7 ? '🔥' : result.newStreak >= 3 ? '⚡' : '✨';

    const xpBar = progressBar(result.newXp % 300, 300);
    const completeText = `🎉 <b>КВЕСТ #${result.questNumber} ВЫПОЛНЕН!</b>

<i>${esc(result.questTitle)}</i>

🏆 <b>+${result.xpGained} XP</b> заработано

Уровень: <b>${result.newLevel}</b>
XP: <code>${xpBar}</code>

${streakEmoji} Streak: <b>${result.newStreak} дней</b>`;

    await ctx.editMessageText(completeText, { parse_mode: 'HTML' });
    await ctx.answerCbQuery('✅ Квест выполнен!');

    // Вирусное сообщение — поделиться ботом
    const { Markup } = require('telegraf');
    const botUsername = ctx.botInfo?.username;
    const shareUrl = `https://t.me/share/url?url=https://t.me/${botUsername}&text=${encodeURIComponent('Я выжил в бизнес-аду. Теперь твоя очередь. Попробуй Daily Quest Bot — если не боишься.')}`;

    await ctx.reply(
      `☠️ <b>Ты выжил.</b>\n\nНо твои друзья — ещё нет.\n\n<i>Отправь им бота. Помоги им выжить.</i>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('☠️ Спасти друзей', shareUrl)]]) }
    );
  } catch (error) {
    logger.error('❌ Ошибка при выполнении квеста:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
}

/**
 * 🗑️ Удалить квест
 */
async function handleQuestDelete(ctx) {
  const questId = ctx.match[1];
  const userId = ctx.from.id;

  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      await ctx.answerCbQuery('❌ Квест не найден', true);
      return;
    }

    const quest = questDoc.data();
    if (quest.userId !== userId.toString()) {
      await ctx.answerCbQuery('❌ Это не твой квест!', true);
      return;
    }

    await questRef.delete();
    const deletedText = `❌ Квест "#${quest.questNumber}" "${quest.title}" удалён`;
    await ctx.editMessageText(deletedText);
    await ctx.answerCbQuery('✅ Удалено', true);
  } catch (error) {
    logger.error('❌ Ошибка удаления квеста:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
}

/**
 * 🌍 Выбрать часовой пояс
 */
async function handleTimezoneSelect(ctx, timezone) {
  const userId = ctx.from.id;

  try {
    await db.updateUser(userId, {
      'settings.timezone': timezone,
    });
    await ctx.answerCbQuery(`✅ Часовой пояс: ${timezone}`, true);
    await ctx.reply(`✅ Часовой пояс установлен на ${timezone}!`, getMainMenuKeyboard());
  } catch (error) {
    logger.error('❌ Ошибка установки timezone:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
}

/**
 * ⏰ Установить дедлайн квеста
 */
async function handleDeadline(ctx, deadlineType) {
  const questId = ctx.match[1];
  const userId = ctx.from.id;

  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      await ctx.answerCbQuery('Квест не найден', true);
      return;
    }

    const quest = questDoc.data();
    if (quest.userId !== userId.toString()) {
      await ctx.answerCbQuery('Это не твой квест!', true);
      return;
    }

    // Рассчитать дедлайн
    let deadline = null;
    let deadlineText = 'Без дедлайна';
    const now = new Date();

    switch (deadlineType) {
      case 'today':
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        deadlineText = 'Сегодня до 23:59';
        break;
      case 'tomorrow':
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
        deadlineText = 'Завтра до 23:59';
        break;
      case '3days':
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59);
        deadlineText = `До ${deadline.toLocaleDateString('ru-RU')}`;
        break;
      case 'week':
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
        deadlineText = `До ${deadline.toLocaleDateString('ru-RU')}`;
        break;
      case 'none':
        deadline = null;
        deadlineText = 'Без дедлайна';
        break;
    }

    // Сохранить дедлайн
    await questRef.update({
      deadline: deadline,
      deadlineNotified: false,
    });

    // Обновить сообщение
    const { Markup } = require('telegraf');
    const painStr = quest.painLevel ? `\n🔥 Уровень боли: <b>${quest.painLevel}/10</b>` : '';
    const updatedMessage = `✨ <b>КВЕСТ #${quest.questNumber}</b>
<i>${esc(quest.title)}</i>

${esc(quest.story)}

🏆 <b>+${quest.xp} XP</b>${painStr}
📅 Дедлайн: <b>${deadlineText}</b>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${questId}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${questId}`)],
    ]);

    await ctx.editMessageText(updatedMessage, { parse_mode: 'HTML', ...keyboard });
    await ctx.answerCbQuery(`⏰ ${deadlineText}`);
  } catch (error) {
    logger.error('Ошибка установки дедлайна:', error);
    await ctx.answerCbQuery('Ошибка', true);
  }
}

module.exports = { register };

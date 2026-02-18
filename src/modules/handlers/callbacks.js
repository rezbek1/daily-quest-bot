/**
 * 🎯 HANDLERS/CALLBACKS - src/modules/handlers/callbacks.js
 * Выполнение, удаление квестов, выбор часовых поясов
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { completeQuest } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');
const { TIMEZONES } = require('../timezone');

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

    const completeText = `🎉 КВЕСТ #${result.questNumber} ВЫПОЛНЕН!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${result.questTitle}
"Ты пережил это. Это все, что имеет значения."

✨ +${result.xpGained} XP за выживание!

📊 Новый уровень: ${result.newLevel}
   Опыт: ${result.newXp} XP

${streakEmoji} Streak: ${result.newStreak} дней подряд!`;

    await ctx.editMessageText(completeText);
    await ctx.answerCbQuery('✅ Квест выполнен!');
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
    const updatedMessage = `✨ КВЕСТ #${quest.questNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${quest.title}

${quest.story}

⭐ +${quest.xp} XP за выживание
⏰ Дедлайн: ${deadlineText}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${questId}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${questId}`)],
    ]);

    await ctx.editMessageText(updatedMessage, keyboard);
    await ctx.answerCbQuery(`⏰ ${deadlineText}`);
  } catch (error) {
    logger.error('Ошибка установки дедлайна:', error);
    await ctx.answerCbQuery('Ошибка', true);
  }
}

module.exports = { register };

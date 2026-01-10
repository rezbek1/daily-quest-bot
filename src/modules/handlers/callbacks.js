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

module.exports = { register };

/**
 * 📝 COMMANDS/FEEDBACK - src/modules/commands/feedback.js
 * /feedback
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { getMainMenuKeyboard } = require('../keyboard');

/**
 * Регистрация команды feedback
 */
function register(bot) {
  bot.command('feedback', handleFeedback);
}

/**
 * /feedback - Отправить обратную связь
 */
async function handleFeedback(ctx) {
  const userId = ctx.from.id;
  const feedback = ctx.message.text.replace('/feedback ', '').trim();

  if (!feedback) {
    await ctx.reply('💬 Использование: /feedback Твой текст\n\nПример: /feedback Добавьте темный режим!', getMainMenuKeyboard());
    return;
  }

  try {
    await db.addFeedback(userId, feedback);
    await ctx.reply('✅ Спасибо за обратную связь! 🙏', getMainMenuKeyboard());
    logger.info(`💬 Feedback от ${userId}: "${feedback}"`);
  } catch (error) {
    logger.error('❌ Ошибка сохранения feedback:', error);
    await ctx.reply('❌ Ошибка при отправке. Попробуй позже.', getMainMenuKeyboard());
  }
}

module.exports = {
  register,
};

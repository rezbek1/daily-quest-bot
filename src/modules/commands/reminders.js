/**
 * 📝 COMMANDS/REMINDERS - src/modules/commands/reminders.js
 * /reminder_test, /test_reminder, /shabbat_info
 */

const logger = require('../../logger');
const { getUser } = require('../users');
const { getActiveQuests } = require('../quests');
const { getShabbatInfo } = require('../shabbat');
const { getMainMenuKeyboard } = require('../keyboard');
const moment = require('moment-timezone');

/**
 * Регистрация команд напоминаний
 */
function register(bot) {
  bot.command('reminder_test', handleReminderTest);
  bot.command('test_reminder', handleTestReminder);
  bot.command('shabbat_info', handleShabbatInfo);
}

/**
 * /reminder_test - Тестовое напоминание
 */
async function handleReminderTest(ctx) {
  const userId = ctx.from.id;
  const user = await getUser(userId);
  
  if (!user) {
    await ctx.reply('❌ Пользователь не найден');
    return;
  }
  
  try {
    await ctx.reply('🧪 Запускаю тестовую отправку напоминания...');
    logger.info(`🧪 ТЕСТОВАЯ ОТПРАВКА для ${user.name}`);
    
    const activeQuests = await getActiveQuests(userId);
    logger.info(`📋 Найдено активных квестов: ${activeQuests?.length || 0}`);
    
    if (!activeQuests || activeQuests.length === 0) {
      await ctx.reply('❌ У тебя нет активных квестов. Создай сначала квест!');
      return;
    }
    
    const timezone = user.settings?.timezone || 'Europe/Moscow';
    const userNow = moment().tz(timezone);
    const userCurrentTime = userNow.format('HH:mm');
    
    const reminderMessage = `🔔 ТЕСТОВОЕ НАПОМИНАНИЕ О КВЕСТАХ

⏰ Время: ${userCurrentTime} (${timezone})
📋 Активных квестов: ${activeQuests.length}

Вот что ждёт:
${activeQuests.slice(0, 3).map((q, i) => `${i + 1}. ${q.title}`).join('\n')}
${activeQuests.length > 3 ? `\n... и ещё ${activeQuests.length - 3}` : ''}

➡️ Давай, выполнять! /quests`;
    
    await ctx.reply(reminderMessage, getMainMenuKeyboard());
    await ctx.reply('✅ Тестовое напоминание отправлено!');
    logger.info(`✅ Тестовое напоминание отправлено ${user.name}`);
  } catch (error) {
    logger.error('❌ Ошибка тестовой отправки:', error);
    await ctx.reply(`❌ Ошибка: ${error.message}`);
  }
}

/**
 * /test_reminder - Ещё один тест (для совместимости)
 */
async function handleTestReminder(ctx) {
  await handleReminderTest(ctx);
}

/**
 * /shabbat_info - Информация о Шабате
 */
async function handleShabbatInfo(ctx) {
  const userId = ctx.from.id;
  
  try {
    const user = await getUser(userId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    const shabbatInfo = await getShabbatInfo(userId, getUser);
    
    if (!shabbatInfo) {
      await ctx.reply(
        `📅 Информация о Шабате недоступна для ${user.settings?.timezone || 'Europe/Moscow'}`,
        getMainMenuKeyboard()
      );
      return;
    }

    const message = `🕯️ ИНФОРМАЦИЯ О ШАБАТЕ

📍 Часовой пояс: ${shabbatInfo.timezone}
📅 Дата: ${shabbatInfo.nextShabbat}

🕯️ Зажигание свечей: ${shabbatInfo.candleTime}
⭐ Завершение Шабата: ${shabbatInfo.havdalahTime}

💡 Напоминания будут пропущены в течение этого периода.`;

    await ctx.reply(message, getMainMenuKeyboard());
  } catch (error) {
    logger.error('❌ Ошибка при получении информации о Шабате:', error);
    await ctx.reply('❌ Ошибка загрузки информации', getMainMenuKeyboard());
  }
}

module.exports = {
  register,
};

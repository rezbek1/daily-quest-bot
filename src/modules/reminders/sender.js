/**
 * 🔔 REMINDERS/SENDER - src/modules/reminders/sender.js
 * Планировщик отправки напоминаний
 */

const cron = require('node-cron');
const logger = require('../../logger');
const { db } = require('../../db');
const { isShabbat } = require('../shabbat');
const { getActiveQuests } = require('../quests');
const moment = require('moment-timezone');

let job = null;
let bot = null;

/**
 * Сохранить bot для использования в scheduler
 */
function register(botInstance) {
  bot = botInstance;
}

/**
 * Запустить планировщик напоминаний
 */
function startScheduler() {
  logger.info('✅✅✅ ЗАПУСКАЮ ПЛАНИРОВЩИК НАПОМИНАНИЙ ✅✅✅');
  logger.info('⏰ Проверка напоминаний: каждую минуту для каждого часового пояса');

  // Запускать каждую минуту
  job = cron.schedule('* * * * *', async () => {
    await sendReminders();
    await checkDeadlines();
  });
}

/**
 * Остановить планировщик
 */
function stopScheduler() {
  if (job) {
    job.stop();
    logger.info('⏸️ Планировщик напоминаний остановлен');
  }
}

/**
 * Отправить напоминания пользователям
 */
async function sendReminders() {
  try {
    logger.info('🔍 ЗАПУСК ПРОВЕРКИ НАПОМИНАНИЙ');
    
    // Получить всех пользователей
    const usersSnapshot = await db.collection('users').get();
    logger.info(`📊 Всего пользователей: ${usersSnapshot.docs.length}`);
    
    let sentCount = 0;
    let shabbatSkipped = 0;
    let skippedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const reminderTime = user.settings?.reminderTime;
      const timezone = user.settings?.timezone || 'Europe/Moscow';
      
      // Проверить есть ли время напоминания
      if (!reminderTime) {
        continue;
      }

      // Получить текущее время в timezone пользователя
      const userNow = moment().tz(timezone);
      const userHour = String(userNow.hours()).padStart(2, '0');
      const userMinute = String(userNow.minutes()).padStart(2, '0');
      const userCurrentTime = `${userHour}:${userMinute}`;

      // Проверить совпадает ли время напоминания
      if (userCurrentTime !== reminderTime) {
        continue;
      }

      // Проверить, не было ли уже отправлено напоминание сегодня
      const todayDate = userNow.format('YYYY-MM-DD');
      const lastReminderDate = user.lastReminderSentDate;
      
      if (lastReminderDate === todayDate) {
        skippedCount++;
        continue;
      }

      // ✅ НОВОЕ: Проверяем Шабат перед отправкой
      const inShabbat = await isShabbat(user.userId || userDoc.id, () => Promise.resolve(user), logger);
      if (inShabbat) {
        logger.info(`🕯️ ШАБАТ: Пропускаем напоминание для ${user.name}`);
        shabbatSkipped++;
        continue;
      }

      logger.info(`✅ ${user.name}: время совпадает! Проверяю активные квесты...`);

      // Если время совпало - проверить есть ли активные квесты
      const userId = user.userId || userDoc.id;
      const activeQuests = await getActiveQuests(userId);
      logger.info(`📋 ${user.name}: активных квестов: ${activeQuests?.length || 0}`);

      if (activeQuests && activeQuests.length > 0) {
        // Есть активные квесты - отправить напоминание
        try {
          const reminderMessage = `🔔 НАПОМИНАНИЕ О КВЕСТАХ

⏰ Время: ${userCurrentTime} (${timezone})
📋 Активных квестов: ${activeQuests.length}

Вот что ждёт:
${activeQuests.slice(0, 3).map((q, i) => `${i + 1}. ${q.title}`).join('\n')}
${activeQuests.length > 3 ? `\n... и ещё ${activeQuests.length - 3}` : ''}

➡️ Давай, выполнять! /quests`;
          
          if (bot) {
            await bot.telegram.sendMessage(userId, reminderMessage);
          }
          
          // Сохраняем дату отправки
          await db.updateUser(userDoc.id, {
            lastReminderSentDate: todayDate,
            lastReminderSentTime: new Date()
          });
          
          logger.info(`✅ Напоминание отправлено ${user.name} в ${userCurrentTime}`);
          sentCount++;
        } catch (error) {
          logger.warn(`⚠️ Ошибка отправки напоминания ${user.name}: ${error.message}`);
        }
      } else {
        logger.info(`⏭️ ${user.name}: нет активных квестов, но время совпало. Отправляю уведомление...`);
        
        try {
          const noQuestsMessage = `🔔 ВРЕМЯ НАПОМИНАНИЯ

⏰ ${userCurrentTime} (${timezone})

😴 У тебя нет активных квестов!

💡 Совет: создай новый квест или возьмись за что-то из архива. /quests`;
          
          if (bot) {
            await bot.telegram.sendMessage(userId, noQuestsMessage);
          }
          
          // Сохраняем дату отправки
          await db.updateUser(userDoc.id, {
            lastReminderSentDate: todayDate,
            lastReminderSentTime: new Date()
          });
          
          logger.info(`✅ Уведомление отправлено ${user.name}`);
          sentCount++;
        } catch (error) {
          logger.warn(`⚠️ Ошибка отправки уведомления ${user.name}: ${error.message}`);
        }
      }
    }
    
    logger.info('═══════════════════════════════════════');
    logger.info('✅ ПРОВЕРКА НАПОМИНАНИЙ ЗАВЕРШЕНА');
    logger.info('═══════════════════════════════════════');
    logger.info(`📊 Проверено пользователей: ${usersSnapshot.docs.length}`);
    logger.info(`📤 Отправлено напоминаний: ${sentCount}`);
    logger.info(`🕯️ Пропущено (Шабат): ${shabbatSkipped}`);
    logger.info(`⏭️ Пропущено (уже отправлено): ${skippedCount}`);
    logger.info('═══════════════════════════════════════');
    
  } catch (error) {
    logger.error('❌ Ошибка при отправке напоминаний:', error);
  }
}

/**
 * Проверить дедлайны квестов
 */
async function checkDeadlines() {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Получить все активные квесты с дедлайнами
    const questsSnapshot = await db.collection('quests')
      .where('completed', '==', false)
      .where('deadline', '!=', null)
      .get();

    for (const questDoc of questsSnapshot.docs) {
      const quest = questDoc.data();
      const deadline = quest.deadline?.toDate ? quest.deadline.toDate() : new Date(quest.deadline);

      // Проверка: за 2 часа до дедлайна (напоминание)
      if (!quest.deadlineNotified && deadline <= twoHoursFromNow && deadline > now) {
        try {
          const timeLeft = Math.round((deadline - now) / (60 * 1000));
          const hoursLeft = Math.floor(timeLeft / 60);
          const minutesLeft = timeLeft % 60;

          const reminderMsg = `⏰ НАПОМИНАНИЕ О ДЕДЛАЙНЕ!

Квест #${quest.questNumber}: "${quest.title}"

До дедлайна осталось: ${hoursLeft > 0 ? `${hoursLeft}ч ` : ''}${minutesLeft}мин

Успей выполнить! /quests`;

          if (bot) {
            await bot.telegram.sendMessage(quest.userId, reminderMsg);
          }

          // Отметить что уведомили
          await questDoc.ref.update({ deadlineNotified: true });
          logger.info(`⏰ Напоминание о дедлайне отправлено: квест #${quest.questNumber}`);
        } catch (error) {
          logger.warn(`⚠️ Ошибка отправки напоминания о дедлайне: ${error.message}`);
        }
      }

      // Проверка: дедлайн прошёл (просрочено)
      if (!quest.overdue && deadline < now) {
        try {
          const overdueMsg = `❌ ДЕДЛАЙН ПРОПУЩЕН!

Квест #${quest.questNumber}: "${quest.title}"

Дедлайн был: ${deadline.toLocaleString('ru-RU')}

😔 Streak сброшен. Квест всё ещё активен - можешь выполнить!

/quests`;

          if (bot) {
            await bot.telegram.sendMessage(quest.userId, overdueMsg);
          }

          // Отметить как просроченный
          await questDoc.ref.update({ overdue: true });

          // Сбросить streak пользователя
          await db.updateUser(quest.userId, { streak: 0 });

          logger.info(`❌ Квест #${quest.questNumber} просрочен, streak сброшен`);
        } catch (error) {
          logger.warn(`⚠️ Ошибка обработки просроченного квеста: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error('❌ Ошибка проверки дедлайнов:', error);
  }
}

module.exports = {
  register,
  startScheduler,
  stopScheduler,
  sendReminders,
  checkDeadlines,
};

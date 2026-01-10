/**
 * 🎯 HANDLERS/ACTIONS - src/modules/handlers/actions.js
 * bot.action обработчики для меню
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { getMainMenuKeyboard, getAdminKeyboard } = require('../keyboard');
const { getTzKeyboard } = require('../keyboard/timezone');
const { getUser } = require('../users');
const { getActiveQuests, getTodayQuests } = require('../quests');
const moment = require('moment-timezone');

/**
 * Регистрация всех action обработчиков
 */
function register(bot) {
  // Главное меню
  bot.action('menu_add', handleMenuAdd);
  bot.action('menu_quests', handleMenuQuests);
  bot.action('menu_profile', handleMenuProfile);
  bot.action('menu_stats', handleMenuStats);
  bot.action('menu_settings', handleMenuSettings);
  bot.action('menu_help', handleMenuHelp);
  bot.action('menu_home', handleMenuHome);
  bot.action('menu_leaderboard', handleMenuLeaderboard);
  
  // Режимы сложности
  bot.action('set_pain_light', handleSetPainLight);
  bot.action('set_pain_black', handleSetPainBlack);
  bot.action('set_pain_venture', handleSetPainVenture);
  
  // Время напоминаний
  bot.action('set_time_08', handleSetTime('08:00'));
  bot.action('set_time_12', handleSetTime('12:00'));
  bot.action('set_time_17', handleSetTime('17:00'));
  bot.action('set_time_19', handleSetTime('19:00'));
  bot.action('set_time_21', handleSetTime('21:00'));
  bot.action('set_time_23', handleSetTime('23:00'));
  
  // Часовые пояса
  bot.action('select_timezone', handleSelectTimezone);
}

/**
 * 📝 Добавить задачу
 */
async function handleMenuAdd(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.waitingForTask = true;
  await ctx.reply('📝 Введите описание задачи:\n\nПример: "позвонить клиенту"', 
    require('telegraf').Markup.keyboard([['❌ Отмена']]).resize());
  await ctx.answerCbQuery();
}

/**
 * 📋 Показать квесты
 */
async function handleMenuQuests(ctx) {
  const userId = ctx.from.id;
  const quests = await getActiveQuests(userId);

  if (quests.length === 0) {
    await ctx.answerCbQuery('📭 Нет квестов', true);
    return;
  }

  let message = `📋 АКТИВНЫЕ КВЕСТЫ (${quests.length})\n`;
  message += `${'━'.repeat(40)}\n\n`;

  for (const quest of quests) {
    const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
    message += `#${quest.questNumber} 💀 ${quest.title}\n`;
    message += `${difficulty} +${quest.xp} XP\n\n`;
  }

  const buttons = quests.map((quest) => [
    require('telegraf').Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
    require('telegraf').Markup.button.callback(`🗑️ #${quest.questNumber}`, `delete_${quest.id}`),
  ]);

  const keyboard = require('telegraf').Markup.inlineKeyboard([
    ...buttons,
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(message, keyboard);
  await ctx.answerCbQuery();
}

/**
 * 👤 Профиль
 */
async function handleMenuProfile(ctx) {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  const streakEmoji = user.streak >= 7 ? '🔥' : user.streak >= 3 ? '⚡' : '✨';

  const profileMessage = `👤 ПРОФИЛЬ: ${user.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Уровень: ${user.level} ${'💀'.repeat(Math.min(user.level, 5))}
Опыт: ${user.xp}/${user.level * 300} XP
${streakEmoji} Streak: ${user.streak} дней`;

  await ctx.reply(profileMessage, getMainMenuKeyboard());
  await ctx.answerCbQuery();
}

/**
 * 📈 Статистика
 */
async function handleMenuStats(ctx) {
  const userId = ctx.from.id;
  const user = await getUser(userId);
  const activeQuests = await getActiveQuests(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  const message = `📊 СТАТИСТИКА
Уровень: ${user.level}
Всего XP: ${user.xp}
Квестов выполнено: ${user.totalQuestsCompleted}
Активных: ${activeQuests.length}`;

  await ctx.reply(message, getMainMenuKeyboard());
  await ctx.answerCbQuery();
}

/**
 * ⚙️ Настройки
 */
async function handleMenuSettings(ctx) {
  const settingsMessage = `⚙️ НАСТРОЙКИ УРОВНЯ БОЛИ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Выбери уровень сарказма и время напоминаний:`;

  const { Markup } = require('telegraf');
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('😅 Лёгкий', 'set_pain_light'),
      Markup.button.callback('💀 Чёрный', 'set_pain_black'),
      Markup.button.callback('🔥 Венчурное', 'set_pain_venture'),
    ],
    [
      Markup.button.callback('08:00', 'set_time_08'),
      Markup.button.callback('12:00', 'set_time_12'),
      Markup.button.callback('17:00', 'set_time_17'),
    ],
    [
      Markup.button.callback('19:00', 'set_time_19'),
      Markup.button.callback('21:00', 'set_time_21'),
      Markup.button.callback('23:00', 'set_time_23'),
    ],
    [Markup.button.callback('🌍 Часовые пояса', 'select_timezone')],
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(settingsMessage, keyboard);
  await ctx.answerCbQuery();
}

/**
 * ❓ Помощь
 */
async function handleMenuHelp(ctx) {
  const helpMessage = `❓ СПРАВКА ПО КОМАНДАМ

📝 УПРАВЛЕНИЕ:
/addtask - создать квест
/quests - все квесты
/today - квесты на сегодня

👤 ПРОФИЛЬ:
/profile - профиль
/stats - статистика
/leaderboard - лидерборд

💬 ДРУГОЕ:
/help - эта справка
/feedback - обратная связь`;

  await ctx.reply(helpMessage, getMainMenuKeyboard());
  await ctx.answerCbQuery();
}

/**
 * 🏠 На главную
 */
async function handleMenuHome(ctx) {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  const xpProgress = Math.round((user.xp % 300) / 3);

  const message = `💬 ЦИТАТА ДНЯ:
"Успешный предприниматель - это тот, кто научился скрывать панику"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Твой статус:
Уровень: ${user.level} | XP: ${user.xp}/${user.level * 300}
Статус: ${user.name} 💀`;

  await ctx.reply(message, getMainMenuKeyboard());
  await ctx.answerCbQuery();
}

/**
 * 🏆 Лидерборд
 */
async function handleMenuLeaderboard(ctx) {
  const userId = ctx.from.id;
  
  try {
    await ctx.answerCbQuery();
    
    const user = await getUser(userId);
    if (!user) {
      await ctx.reply('❌ Сначала создай хотя бы один квест!', getMainMenuKeyboard());
      return;
    }

    const usersSnapshot = await db.collection('users').get();
    const allUsers = [];
    let userPosition = null;
    let position = 1;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      allUsers.push({
        userId: userData.userId,
        name: userData.name,
        completed: userData.totalQuestsCompleted || 0,
        streak: userData.streak || 0,
        position: position,
      });
      position++;
    });

    // Сортируем по квестам
    allUsers.sort((a, b) => b.completed - a.completed);

    // Переназначим позиции после сортировки
    allUsers.forEach((u, i) => {
      u.position = i + 1;
      if (u.userId === userId.toString()) {
        userPosition = u.position;
      }
    });

    // Показываем только топ-3
    let message = '🏆 ЛИДЕРБОРД\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    const medals = ['🥇', '🥈', '🥉'];

    allUsers.slice(0, 3).forEach((u, i) => {
      const medal = medals[i];
      message += `${medal} ${u.name.substring(0, 15)} - ${u.completed} квестов (🔥${u.streak} дн)\n`;
    });

    // Показываем позицию пользователя
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (userPosition) {
      message += `\n📍 Ты на ${userPosition} месте`;
    } else {
      message += `\n📍 Ты еще не в рейтинге`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await ctx.reply(message, getMainMenuKeyboard());
  } catch (error) {
    logger.error('❌ Ошибка лидерборда:', error);
  }
}

/**
 * Режимы боли (сложность)
 */
async function handleSetPainLight(ctx) {
  const userId = ctx.from.id;
  try {
    await db.updateUser(userId, { theme: 'light' });
    await ctx.answerCbQuery('✅ Режим: 😅 Лёгкий', true);
  } catch (error) {
    logger.error('Ошибка:', error);
  }
}

async function handleSetPainBlack(ctx) {
  const userId = ctx.from.id;
  try {
    await db.updateUser(userId, { theme: 'black' });
    await ctx.answerCbQuery('✅ Режим: 💀 Чёрный', true);
  } catch (error) {
    logger.error('Ошибка:', error);
  }
}

async function handleSetPainVenture(ctx) {
  const userId = ctx.from.id;
  try {
    await db.updateUser(userId, { theme: 'venture' });
    await ctx.answerCbQuery('✅ Режим: 🔥 Венчурное', true);
  } catch (error) {
    logger.error('Ошибка:', error);
  }
}

/**
 * Время напоминаний
 */
function handleSetTime(time) {
  return async (ctx) => {
    const userId = ctx.from.id;
    try {
      await db.updateUser(userId, {
        'settings.reminderTime': time,
      });
      await ctx.answerCbQuery(`✅ Время: ${time}`, true);
    } catch (error) {
      logger.error('Ошибка:', error);
    }
  };
}

/**
 * Выбор часового пояса
 */
async function handleSelectTimezone(ctx) {
  const { TIMEZONES } = require('../timezone');
  const keyboard = getTzKeyboard(TIMEZONES);
  await ctx.reply('🌍 Выбери свой часовой пояс:', keyboard);
  await ctx.answerCbQuery();
}

module.exports = { register };

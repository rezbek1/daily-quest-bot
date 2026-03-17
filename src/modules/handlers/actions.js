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
const { getQuoteOfDay } = require('../../utils/quotes');
const moment = require('moment-timezone');
const { esc, progressBar, levelTitle } = require('../../utils/format');

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

  // Режим Шабата
  bot.action('toggle_shabbat', handleToggleShabbat);
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

  let message = `📋 <b>АКТИВНЫЕ КВЕСТЫ (${quests.length})</b>\n\n`;

  for (const quest of quests) {
    const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
    const deadlineStr = quest.deadline
      ? `\n📅 <i>до ${new Date(quest.deadline?.toDate ? quest.deadline.toDate() : quest.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</i>`
      : '';
    message += `#${quest.questNumber} 💀 <b>${esc(quest.title)}</b>${deadlineStr}\n`;
    message += `${difficulty || '⭐'} <b>+${quest.xp} XP</b>\n\n`;
  }

  const buttons = quests.map((quest) => [
    require('telegraf').Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
    require('telegraf').Markup.button.callback(`🗑️ #${quest.questNumber}`, `delete_${quest.id}`),
  ]);

  const keyboard = require('telegraf').Markup.inlineKeyboard([
    ...buttons,
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
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
  const xpBar = progressBar(user.xp % 300, 300);
  const xpPercent = Math.round((user.xp % 300) / 3);

  const profileMessage = `👤 <b>${esc(user.name)}</b> — Уровень ${user.level} 💀
<i>${esc(levelTitle(user.level))}</i>

XP: <code>${xpBar}</code> ${xpPercent}%
<i>${user.xp % 300} / ${user.level * 300} XP</i>

${streakEmoji} Streak: <b>${user.streak} дней</b>
✅ Выполнено: <b>${user.totalQuestsCompleted}</b>`;

  await ctx.reply(profileMessage, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
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

  const message = `📊 <b>СТАТИСТИКА</b>

Уровень: <b>${user.level}</b> · ${esc(levelTitle(user.level))}
Всего XP: <b>${user.xp}</b>
Выполнено квестов: <b>${user.totalQuestsCompleted}</b>
В работе: <b>${activeQuests.length}</b>`;

  await ctx.reply(message, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
  await ctx.answerCbQuery();
}

/**
 * Построить сообщение и клавиатуру настроек
 */
function buildSettingsView(shabbatEnabled, reminderTime, timezone) {
  const { Markup } = require('telegraf');
  const shabbatStatus = shabbatEnabled ? '✅ ВКЛ' : '❌ ВЫКЛ';

  const message = `⚙️ <b>Настройки уровня боли</b>

😅 <b>Лёгкий</b> — мягкий сарказм
💀 <b>Чёрный</b> — без пощады
🔥 <b>Венчурное</b> — "ты обязан успеть"

⏰ Текущее время напоминания: <b>${reminderTime || '19:00'}</b>
🌍 Часовой пояс: <b>${timezone || 'Europe/Moscow'}</b>

🕯️ Режим Шабата: <b>${shabbatStatus}</b>
<i>(Без уведомлений в Шабат)</i>`;

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
    [Markup.button.callback(`🕯️ Шабат: ${shabbatStatus}`, 'toggle_shabbat')],
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  return { message, keyboard };
}

/**
 * ⚙️ Настройки
 */
async function handleMenuSettings(ctx) {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  const shabbatEnabled = user?.shabbatMode || user?.settings?.shabbatMode || false;
  const { message, keyboard } = buildSettingsView(
    shabbatEnabled,
    user?.settings?.reminderTime,
    user?.settings?.timezone
  );

  await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  await ctx.answerCbQuery();
}

/**
 * ❓ Помощь
 */
async function handleMenuHelp(ctx) {
  const helpMessage = `❓ <b>Справка по командам</b>

📝 <b>Управление квестами:</b>
/addtask — создать квест
/quests — все активные квесты
/today — квесты на сегодня

👤 <b>Профиль:</b>
/profile — твой профиль
/stats — статистика
/leaderboard — лидерборд

🕯️ <b>Шабат:</b>
/shabbat_info — когда начинается Шабат

💬 <b>Другое:</b>
/feedback — обратная связь`;

  await ctx.reply(helpMessage, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
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

  const quoteOfDay = await getQuoteOfDay();
  const xpBar = progressBar(user.xp % 300, 300);
  const xpPercent = Math.round((user.xp % 300) / 3);

  const message = `💬 <b>Цитата дня:</b>
<i>"${esc(quoteOfDay)}"</i>

👤 ${esc(user.name)} · Уровень ${user.level} 💀
XP: <code>${xpBar}</code> ${xpPercent}%`;

  await ctx.reply(message, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
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
      // Правильно сравниваем userId (приводим оба к строке)
      if (String(u.userId) === String(userId)) {
        userPosition = u.position;
      }
    });

    let message = '🏆 <b>ЛИДЕРБОРД</b>\n\n';
    const medals = ['🥇', '🥈', '🥉'];

    allUsers.slice(0, 3).forEach((u, i) => {
      message += `${medals[i]} <b>${esc(u.name.substring(0, 15))}</b> — ${u.completed} квестов · 🔥${u.streak} дн\n`;
    });

    message += '\n';
    if (userPosition) {
      message += `📍 Ты на <b>${userPosition} месте</b>`;
    } else {
      message += `📍 <i>Ты ещё не в рейтинге</i>`;
    }

    await ctx.reply(message, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
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

/**
 * 🕯️ Переключить режим Шабата
 */
async function handleToggleShabbat(ctx) {
  const userId = ctx.from.id;
  try {
    const user = await getUser(userId);
    const currentState = user?.shabbatMode || user?.settings?.shabbatMode || false;
    const newState = !currentState;

    await db.updateUser(userId, { shabbatMode: newState });

    const statusText = newState ? '✅ включён' : '❌ выключен';
    await ctx.answerCbQuery(`🕯️ Режим Шабата ${statusText}`, true);

    // Показываем обновлённое меню настроек
    const { message, keyboard } = buildSettingsView(
      newState,
      user?.settings?.reminderTime,
      user?.settings?.timezone
    );
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    logger.error('Ошибка переключения Шабата:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
}

module.exports = { register };

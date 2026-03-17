/**
 * 📝 COMMANDS/PROFILE - src/modules/commands/profile.js
 * /profile, /stats, /leaderboard
 */

const logger = require('../../logger');
const { getUser } = require('../users');
const { getActiveQuests } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');
const { db } = require('../../db');
const { esc, progressBar, levelTitle } = require('../../utils/format');

/**
 * Регистрация команд профиля
 */
function register(bot) {
  bot.command('profile', handleProfile);
  bot.command('stats', handleStats);
  bot.command('leaderboard', handleLeaderboard);
}

/**
 * /profile - Профиль пользователя
 */
async function handleProfile(ctx) {
  const userId = ctx.from.id;
  
  try {
    const user = await getUser(userId);
    
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. /start', getMainMenuKeyboard());
      return;
    }

    const streakEmoji = user.streak >= 7 ? '🔥' : user.streak >= 3 ? '⚡' : '✨';
    const xpMax = user.level * 300;
    const xpBar = progressBar(user.xp % 300, 300);
    const xpPercent = Math.round((user.xp % 300) / 3);

    const profileMessage = `👤 <b>${esc(user.name)}</b> — Уровень ${user.level} 💀
<i>${esc(levelTitle(user.level))}</i>

XP: <code>${xpBar}</code> ${xpPercent}%
<i>${user.xp % 300} / ${xpMax} XP до следующего уровня</i>

✅ Квестов выполнено: <b>${user.totalQuestsCompleted}</b>
${streakEmoji} Streak: <b>${user.streak} дней</b>

🏆 Бейджи: ${user.badges?.length ? esc(user.badges.join(', ')) : '<i>пока нет</i>'}

⚙️ Напоминания: ${user.settings?.reminderTime || '19:00'} · 🌍 ${user.settings?.timezone || 'Europe/Moscow'}`;

    await ctx.reply(profileMessage, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
  } catch (error) {
    logger.error('❌ Ошибка /profile:', error);
    await ctx.reply('❌ Ошибка загрузки профиля', getMainMenuKeyboard());
  }
}

/**
 * /stats - Подробная статистика
 */
async function handleStats(ctx) {
  const userId = ctx.from.id;
  
  try {
    const user = await getUser(userId);
    const activeQuests = await getActiveQuests(userId);

    if (!user) {
      await ctx.reply('❌ Ошибка', getMainMenuKeyboard());
      return;
    }

    const daysInGame = Math.floor((new Date() - user.createdAt.toDate()) / (1000 * 60 * 60 * 24));
    const efficiency = user.totalQuestsCompleted > 0
      ? Math.min(100, Math.round((user.totalQuestsCompleted / (daysInGame || 1)) * 10))
      : 0;

    let statsMessage = `📊 <b>СТАТИСТИКА</b>

👤 ${esc(user.name)} · Уровень ${user.level}
Всего XP: <b>${user.xp}</b>
Выполнено квестов: <b>${user.totalQuestsCompleted}</b>
В работе: <b>${activeQuests.length}</b>`;

    if (activeQuests.length > 0 && activeQuests.length <= 5) {
      statsMessage += '\n\n';
      activeQuests.forEach((quest) => {
        statsMessage += `  • #${quest.questNumber} <i>${esc(quest.title)}</i>\n`;
      });
    }

    statsMessage += `
📈 Эффективность: <b>${efficiency} квестов/10 дней</b>
🗓 Дней в игре: <b>${daysInGame}</b>
⚡ Streak: <b>${user.streak} дней</b>

<i>Больше квестов → больше XP → больше уровней → 🖤</i>`;

    await ctx.reply(statsMessage, { parse_mode: 'HTML', ...getMainMenuKeyboard() });
  } catch (error) {
    logger.error('❌ Ошибка /stats:', error);
    await ctx.reply('❌ Ошибка загрузки статистики', getMainMenuKeyboard());
  }
}

/**
 * /leaderboard - Лидерборд
 */
async function handleLeaderboard(ctx) {
  const userId = ctx.from.id;
  
  try {
    // Получить ВСЕ пользователей отсортированные по XP
    const allUsersSnapshot = await db.collection('users').orderBy('xp', 'desc').get();
    
    let topUsers = [];
    let userPosition = null;
    let position = 1;

    allUsersSnapshot.forEach((doc) => {
      const user = doc.data();
      
      // Добавить в топ если это топ-3
      if (position <= 3) {
        topUsers.push({ name: user.name, level: user.level, xp: user.xp, position });
      }
      
      // Найти позицию текущего пользователя (правильно сравниваем userId)
      if (String(user.userId) === String(userId)) {
        userPosition = position;
      }
      
      position++;
    });

    // Построить сообщение
    let message = '🏆 ЛИДЕРБОРД\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    const medals = ['🥇', '🥈', '🥉'];

    // Показать только топ-3
    topUsers.forEach((user, idx) => {
      const medal = medals[idx];
      message += `${medal} ${user.name.substring(0, 15)} - Ур. ${user.level}\n`;
    });

    // Показать позицию пользователя
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (userPosition) {
      message += `\n📍 Ты на ${userPosition} месте`;
    } else {
      message += `\n📍 Ты еще не в рейтинге`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    await ctx.reply(message, getMainMenuKeyboard());
  } catch (error) {
    logger.error('❌ Ошибка /leaderboard:', error);
    await ctx.reply('❌ Ошибка загрузки лидерборда', getMainMenuKeyboard());
  }
}

module.exports = {
  register,
};

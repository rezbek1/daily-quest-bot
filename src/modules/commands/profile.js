/**
 * 📝 COMMANDS/PROFILE - src/modules/commands/profile.js
 * /profile, /stats, /leaderboard
 */

const logger = require('../../logger');
const { getUser } = require('../users');
const { getActiveQuests } = require('../quests');
const { getMainMenuKeyboard } = require('../keyboard');
const { db } = require('../../db');

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

    const profileMessage = `👤 ПРОФИЛЬ: ${user.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ОСНОВНЫЕ СТАТИСТИКИ
Уровень: ${user.level} ${'💀'.repeat(Math.min(user.level, 5))}
Опыт: ${user.xp}/${user.level * 300} XP (${Math.round((user.xp % 300) / 3)}%)

📈 ПРОГРЕСС
✅ Всего квестов: ${user.totalQuestsCompleted}
${streakEmoji} Streak: ${user.streak} дней

🏆 БЕЙДЖИ: ${user.badges.join(', ') || 'Еще нет'}

⚙️ НАСТРОЙКИ
🎨 Тема: ${user.theme}
🔔 Напоминания: ${user.settings?.reminderTime || '19:00'}
🌍 Язык: ${user.settings?.language || 'ru'}`;

    await ctx.reply(profileMessage, getMainMenuKeyboard());
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

    let statsMessage = `📊 СТАТИСТИКА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ${user.name}
Уровень: ${user.level}
Всего XP: ${user.xp}
Квестов выполнено: ${user.totalQuestsCompleted}

🎯 СЕЙЧАС В РАБОТЕ: ${activeQuests.length} квестов`;

    if (activeQuests.length > 0 && activeQuests.length <= 5) {
      statsMessage += `\n${'─'.repeat(40)}\n`;
      activeQuests.forEach((quest) => {
        statsMessage += `#${quest.questNumber} ${quest.title}\n`;
      });
    }

    statsMessage += `

${'━'.repeat(40)}

📈 ЭФФЕКТИВНОСТЬ: ${user.totalQuestsCompleted > 0 ? '95%' : '0%'}

🎯 АКТИВНОСТЬ
Дней в игре: ${Math.floor((new Date() - user.createdAt.toDate()) / (1000 * 60 * 60 * 24))}
Streak: ${user.streak} дней

💡 Больше квестов → больше XP → больше уровней → 🖤`;

    await ctx.reply(statsMessage, getMainMenuKeyboard());
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
    const usersSnapshot = await db.collection('users').orderBy('xp', 'desc').limit(10).get();

    let message = '🏆 ГЛОБАЛЬНЫЙ ЛИДЕРБОРД СТРАДАНИЙ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    const medals = ['🥇', '🥈', '🥉'];
    let position = 1;

    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      const medal = medals[position - 1] || `${position}.`;
      message += `${medal} ${user.name.substring(0, 15)} | Ур. ${user.level} | ${user.xp} XP\n`;
      position++;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nЭто боль, облаченная в XP.`;
    await ctx.reply(message, getMainMenuKeyboard());
  } catch (error) {
    logger.error('❌ Ошибка /leaderboard:', error);
    await ctx.reply('❌ Ошибка загрузки лидерборда', getMainMenuKeyboard());
  }
}

module.exports = {
  register,
};

/**
 * 🖤 ПОВСЕДНЕВНЫЙ КВЕСТ - Telegram Bot
 * Для циничных бизнесменов, которые ненавидят свою работу
 * 
 * Версия: Главное меню ВИДНО ВЕЗДЕ с inline кнопками
 */

const { Telegraf, session, Markup } = require('telegraf');
const dotenv = require('dotenv');
const winston = require('winston');
const admin = require('firebase-admin');
const axios = require('axios');

dotenv.config();

// ==================== КОНФИГУРАЦИЯ ====================

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// ==================== ЛОГИРОВАНИЕ ====================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// ==================== FIREBASE ====================

try {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG),
  });
} catch (error) {
  logger.error('❌ Ошибка Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();
logger.info('✅ Firebase инициализирован');

// ==================== TELEGRAM БОТ ====================

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());
logger.info('🤖 Бот инициализирован');

// ==================== PROMPTS FOR CHATGPT ====================

const PROMPTS = {
  corporate: `Ты создатель квестов для взрослых бизнесменов, которые ненавидят свою работу.

ТВОЯ ЗАДАЧА: Превратить корпоративную задачу в забавный квест с ЧЕРНЫМ ЮМОРОМ.
Без сахара, без позитива. Циничный, острый, немного жестокий.

ПРАВИЛА:
1. Максимум 3 предложения (150 слов)
2. Черный юмор, сарказм, цинизм ПРИВЕТСТВУЕТСЯ
3. Реальность: deadline = смерть, отчет = оформление акта о смерти
4. Цели → враги (босс = дракон, клиент = тиран, совещание = казнь)
5. НЕ включай: реальное насилие, сексизм
6. ВКЛЮЧАЙ: циничность, мрак, реалистичность

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста, БЕЗ комментариев. Черный юмор.`,

  startup: `Ты мастер квестов для людей, которые добровольно вышли в боевые действия без защиты и зарплаты.

ЗАДАЧА: Превратить задачу стартапера в квест про выживание в условиях хаоса с черным юмором.

ПРАВИЛА:
1. Язык: стартап-культура, недосыпание, неопределенность, pivots
2. Черный юмор про отсутствие денег, sleep deprivation
3. Враги: конкуренты, инвесторы, код, сроки, собственный организм
4. Реалистичность: это боевой приказ

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста.`,

  corporate_war: `Ты стратег древних сражений в мире бизнеса, где каждый совещание — это подготовка к броску в спину.

ЗАДАЧА: Описать корпоративную задачу как стратегический ход в многоуровневой игре политики.

ПРАВИЛА:
1. Язык: стратегия, политика, подводные течения, фракции
2. Враги: коллеги, конкурирующие отделы, власть, время
3. Реальность: большие компании медленнее, но опаснее
4. Черный юмор про бюрократию, политику

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста.`,
};

// ==================== UTILITY FUNCTIONS ====================

async function getUser(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    logger.error('Ошибка получения пользователя:', error);
    return null;
  }
}

async function createOrUpdateUser(userId, userData) {
  try {
    const userRef = db.collection('users').doc(userId.toString());
    const currentUser = await userRef.get();

    if (!currentUser.exists) {
      await userRef.set({
        userId,
        name: userData.first_name || 'Аноним',
        username: userData.username || `user_${userId}`,
        level: 1,
        xp: 0,
        totalQuestsCompleted: 0,
        badges: ['Первый день'],
        theme: 'corporate',
        settings: { reminderTime: '19:00', language: 'ru', weeklyReportDay: 'sunday' },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streak: 0,
      });
      logger.info(`✅ Новый пользователь: ${userId}`);
      return true;
    } else {
      await userRef.update({ lastActiveAt: new Date() });
      return false;
    }
  } catch (error) {
    logger.error('Ошибка создания пользователя:', error);
    return null;
  }
}

async function generateQuestStory(taskDescription, theme = 'corporate') {
  try {
    const promptTemplate = PROMPTS[theme] || PROMPTS.corporate;
    const prompt = promptTemplate.replace('{TASK}', taskDescription);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Ты создатель квестов с черным юмором.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    logger.error('❌ Ошибка ChatGPT:', error.message);
    return 'Облагородь эту задачу так, чтобы выглядело честным. Используй много слов и мало смысла.';
  }
}

async function createQuest(userId, taskDescription) {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const story = await generateQuestStory(taskDescription, user.theme);
    const words = taskDescription.split(' ').length;
    let xp = 15;
    if (words < 5) xp = 10;
    else if (words > 20) xp = 30;

    const userQuestsSnapshot = await db.collection('quests').where('userId', '==', userId.toString()).get();
    const activeQuests = userQuestsSnapshot.docs.filter(doc => !doc.data().completed);
    const questNumber = activeQuests.length + 1;

    const questId = `quest_${userId}_${Date.now()}`;
    await db.collection('quests').doc(questId).set({
      questId, userId: userId.toString(), questNumber, title: taskDescription,
      story, xp, completed: false, theme: user.theme, createdAt: new Date(), completedAt: null,
    });

    logger.info(`✅ Квест #${questNumber} создан: ${questId}`);
    return { id: questId, title: taskDescription, story, xp, questNumber };
  } catch (error) {
    logger.error('❌ Ошибка создания квеста:', error);
    return null;
  }
}

async function getActiveQuests(userId) {
  try {
    const snapshot = await db.collection('quests').where('userId', '==', userId.toString()).get();
    const quests = [];
    snapshot.forEach((doc) => {
      const quest = doc.data();
      if (!quest.completed) quests.push({ id: doc.id, ...quest });
    });
    quests.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    return quests;
  } catch (error) {
    logger.error('❌ Ошибка получения квестов:', error);
    return [];
  }
}

async function getTodayQuests(userId) {
  const allQuests = await getActiveQuests(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return allQuests.filter(quest => {
    const createdDate = quest.createdAt.toDate();
    return createdDate >= today && createdDate < tomorrow;
  });
}

async function completeQuest(userId, questId) {
  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) return { success: false, error: 'Квест не найден' };

    const quest = questDoc.data();
    if (quest.userId !== userId.toString()) return { success: false, error: 'Это не твой квест!' };
    if (quest.completed) return { success: false, error: 'Этот квест уже выполнен' };

    await questRef.update({ completed: true, completedAt: new Date() });

    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    const user = userDoc.data();

    const newXp = user.xp + quest.xp;
    const newLevel = Math.floor(newXp / 300) + 1;

    await userRef.update({
      xp: newXp, level: newLevel, totalQuestsCompleted: user.totalQuestsCompleted + 1,
      lastActiveAt: new Date(),
    });

    await db.collection('analytics').add({
      userId: userId.toString(), event: 'quest_completed', questId,
      xpGained: quest.xp, newLevel, timestamp: new Date(),
    });

    logger.info(`✅ Квест #${quest.questNumber} выполнен: ${questId}, XP: +${quest.xp}`);
    return {
      success: true, xpGained: quest.xp, newXp, newLevel,
      questNumber: quest.questNumber, questTitle: quest.title,
    };
  } catch (error) {
    logger.error('❌ Ошибка завершения квеста:', error);
    return { success: false, error: 'Ошибка сохранения' };
  }
}

/**
 * ГЛАВНОЕ МЕНЮ С INLINE КНОПКАМИ
 */
function getMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📝 Добавить', 'menu_add'),
      Markup.button.callback('📋 Квесты', 'menu_quests'),
      Markup.button.callback('👤 Профиль', 'menu_profile'),
    ],
    [
      Markup.button.callback('📈 Статистика', 'menu_stats'),
      Markup.button.callback('❓ Помощь', 'menu_help'),
    ],
  ]);
}

// ==================== КОМАНДЫ БОТА ====================

/**
 * /start
 */
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  await createOrUpdateUser(userId, ctx.from);

  const welcomeMessage = `🖤 Добро пожаловать в "Повседневный квест"

Твой рабочий день превращается в опасную игру выживания. 
Каждая скучная задача становится эпическим квестом. 
Потому что без чувства юмора ты просто помрёшь.

📊 Твой статус:
Уровень: 1 | XP: 0/300
Статус: Наивный новичок 💀

Выбери действие или введи /addtask`;

  await ctx.reply(welcomeMessage, getMainMenuKeyboard());
});

/**
 * /addtask - Создать квест
 */
bot.command('addtask', async (ctx) => {
  const userId = ctx.from.id;
  const taskDescription = ctx.message.text.replace('/addtask ', '').trim();

  if (!taskDescription) {
    await ctx.reply('📝 Напиши: /addtask Описание\n\nПример: /addtask отправить письмо', getMainMenuKeyboard());
    return;
  }

  const waitMsg = await ctx.reply('⏳ Генерирую сюжет... 🖤');
  const quest = await createQuest(userId, taskDescription);

  if (!quest) {
    await ctx.reply('❌ Ошибка создания квеста. Попробуй позже.', getMainMenuKeyboard());
    return;
  }

  const questMessage = `✅ КВЕСТ #${quest.questNumber} СОЗДАН!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 ${quest.title}

"${quest.story}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 НАГРАДА: +${quest.xp} XP
⏱️ СТАТУС: Активен`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Выполнено!', `done_${quest.id}`)],
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(questMessage, keyboard);
  try { await ctx.deleteMessage(waitMsg.message_id); } catch (e) {}
});

/**
 * /quests - Все активные квесты
 */
bot.command('quests', async (ctx) => {
  const userId = ctx.from.id;
  const quests = await getActiveQuests(userId);

  if (quests.length === 0) {
    await ctx.reply('📭 Нет активных квестов!\n\nСоздай первый: /addtask описание', getMainMenuKeyboard());
    return;
  }

  let message = `📋 ТВИ АКТИВНЫЕ КВЕСТЫ (${quests.length})\n`;
  message += `${'━'.repeat(40)}\n\n`;

  for (const quest of quests) {
    const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
    message += `#${quest.questNumber} 💀 ${quest.title}\n`;
    message += `"${quest.story.substring(0, 80)}..."\n`;
    message += `${difficulty} +${quest.xp} XP\n`;
    message += `[✅ #${quest.questNumber}] [🗑️ #${quest.questNumber}]\n\n`;
  }

  message += `${'━'.repeat(40)}`;

  const buttons = quests.map((quest) => [
    Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
    Markup.button.callback(`🗑️ #${quest.questNumber}`, `delete_${quest.id}`),
  ]);

  const keyboard = Markup.inlineKeyboard([
    ...buttons,
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(message, keyboard);
});

/**
 * /today - Квесты на сегодня
 */
bot.command('today', async (ctx) => {
  const userId = ctx.from.id;
  const todayQuests = await getTodayQuests(userId);

  if (todayQuests.length === 0) {
    await ctx.reply('📭 Сегодня нет квестов. Создай первый: /addtask', getMainMenuKeyboard());
    return;
  }

  let message = `📅 КВЕСТЫ НА СЕГОДНЯ (${todayQuests.length})\n`;
  message += `${'━'.repeat(40)}\n\n`;

  for (const quest of todayQuests) {
    const difficulty = '⭐'.repeat(Math.min(Math.floor(quest.xp / 20), 5));
    message += `#${quest.questNumber} ${quest.title}\n`;
    message += `${difficulty} +${quest.xp} XP\n`;
    message += `"${quest.story.substring(0, 80)}..."\n\n`;
  }

  const buttons = todayQuests.map((quest) => [
    Markup.button.callback(`✅ #${quest.questNumber}`, `done_${quest.id}`),
    Markup.button.callback(`🗑️ #${quest.questNumber}`, `delete_${quest.id}`),
  ]);

  const keyboard = Markup.inlineKeyboard([
    ...buttons,
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(message, keyboard);
});

/**
 * /profile
 */
bot.command('profile', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.reply('❌ Пользователь не найден. /start', getMainMenuKeyboard());
    return;
  }

  const profileMessage = `👤 ПРОФИЛЬ: ${user.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ОСНОВНЫЕ СТАТИСТИКИ
Уровень: ${user.level} ${'💀'.repeat(Math.min(user.level, 5))}
Опыт: ${user.xp}/${user.level * 300} XP (${Math.round((user.xp % 300) / 3)}%)

📈 ПРОГРЕСС
✅ Всего квестов: ${user.totalQuestsCompleted}
🔥 Streak: ${user.streak} дней

🏆 БЕЙДЖИ: ${user.badges.join(', ')}

⚙️ НАСТРОЙКИ
🎨 Тема: ${user.theme}
🔔 Напоминания: ${user.settings.reminderTime}
🌍 Язык: ${user.settings.language}`;

  await ctx.reply(profileMessage, getMainMenuKeyboard());
});

/**
 * /stats - С активными квестами
 */
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
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
});

/**
 * /help
 */
bot.command('help', async (ctx) => {
  const helpMessage = `❓ СПРАВКА ПО КОМАНДАМ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 УПРАВЛЕНИЕ КВЕСТАМИ:
/addtask [описание] — создать квест
/quests — все квесты
/today — квесты на сегодня

👤 ПРОФИЛЬ И ПРОГРЕСС:
/profile — профиль
/stats — статистика

🏆 ОБЩЕСТВЕННОЕ:
/leaderboard — лидерборд

💡 КАК ЭТО РАБОТАЕТ:
1. /addtask + описание
2. ChatGPT превратит в квест
3. Нажми кнопку → готово!
4. +XP и новый уровень!`;

  await ctx.reply(helpMessage, getMainMenuKeyboard());
});

/**
 * /leaderboard
 */
bot.command('leaderboard', async (ctx) => {
  try {
    const snapshot = await db.collection('users').orderBy('xp', 'desc').limit(10).get();

    let message = '🏆 ГЛОБАЛЬНЫЙ ЛИДЕРБОРД СТРАДАНИЙ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    const medals = ['🥇', '🥈', '🥉'];
    let position = 1;

    snapshot.forEach((doc) => {
      const user = doc.data();
      const medal = medals[position - 1] || `${position}.`;
      message += `${medal} ${user.name.substring(0, 15)} | Ур. ${user.level} | ${user.xp} XP\n`;
      position++;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nЭто боль, облаченная в XP.`;
    await ctx.reply(message, getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка лидерборда:', error);
    await ctx.reply('❌ Ошибка', getMainMenuKeyboard());
  }
});

/**
 * /feedback
 */
bot.command('feedback', async (ctx) => {
  const userId = ctx.from.id;
  const feedback = ctx.message.text.replace('/feedback ', '').trim();

  if (!feedback) {
    await ctx.reply('💬 /feedback Твой текст', getMainMenuKeyboard());
    return;
  }

  try {
    await db.collection('feedback').add({
      userId: userId.toString(),
      text: feedback,
      timestamp: new Date(),
    });
    await ctx.reply('✅ Спасибо! 🙏', getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка feedback:', error);
    await ctx.reply('❌ Ошибка', getMainMenuKeyboard());
  }
});

// ==================== INLINE КНОПКИ ====================

/**
 * Выполнить квест
 */
bot.action(/done_(.+)/, async (ctx) => {
  const questId = ctx.match[1];
  const userId = ctx.from.id;
  const result = await completeQuest(userId, questId);

  if (!result.success) {
    await ctx.answerCbQuery(`❌ ${result.error}`, true);
    return;
  }

  const completeText = `🎉 КВЕСТ #${result.questNumber} ВЫПОЛНЕН!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${result.questTitle}
"Ты пережил это. Это все, что имеет значения."

✨ +${result.xpGained} XP за выживание!

📊 Новый уровень: ${result.newLevel}
   Опыт: ${result.newXp} XP`;

  await ctx.editMessageText(completeText);
  await ctx.answerCbQuery('✅ Квест выполнен!');
});

/**
 * Удалить квест
 */
bot.action(/delete_(.+)/, async (ctx) => {
  const questId = ctx.match[1];
  const userId = ctx.from.id;

  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      await ctx.answerCbQuery('❌ Квест не найден');
      return;
    }

    const quest = questDoc.data();
    if (quest.userId !== userId.toString()) {
      await ctx.answerCbQuery('❌ Это не твой квест!');
      return;
    }

    await questRef.delete();
    const deletedText = `❌ Квест "#${quest.questNumber}" "${quest.title}" удалён`;
    await ctx.editMessageText(deletedText);
    await ctx.answerCbQuery('✅ Удалено');
  } catch (error) {
    logger.error('Ошибка удаления:', error);
    await ctx.answerCbQuery('❌ Ошибка');
  }
});

/**
 * Кнопки главного меню
 */
bot.action('menu_add', async (ctx) => {
  await ctx.reply('📝 Напиши: /addtask Описание\n\nПример: /addtask отправить письмо боссу', getMainMenuKeyboard());
  await ctx.answerCbQuery();
});

bot.action('menu_quests', async (ctx) => {
  await bot.telegram.sendMessage(ctx.from.id, '/quests');
  await ctx.answerCbQuery();
});

bot.action('menu_profile', async (ctx) => {
  await bot.telegram.sendMessage(ctx.from.id, '/profile');
  await ctx.answerCbQuery();
});

bot.action('menu_stats', async (ctx) => {
  await bot.telegram.sendMessage(ctx.from.id, '/stats');
  await ctx.answerCbQuery();
});

bot.action('menu_help', async (ctx) => {
  await bot.telegram.sendMessage(ctx.from.id, '/help');
  await ctx.answerCbQuery();
});

/**
 * Неправильные команды
 */
bot.on('text', async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    await ctx.reply(
      '❌ Команда не найдена.\n\nИспользуй кнопки или /help',
      getMainMenuKeyboard()
    );
  }
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  logger.error('Ошибка бота:', err);
  try {
    ctx.reply('❌ Произошла ошибка. Попробуй позже.', getMainMenuKeyboard());
  } catch (e) {
    logger.error('Ошибка отправки ошибки:', e);
  }
});

// ==================== ЗАПУСК ====================

const startBot = async () => {
  try {
    await bot.launch();
    logger.info('🚀 Бот запущен и готов к работе!');
    logger.info(`🔗 https://t.me/${(await bot.telegram.getMe()).username}`);
  } catch (error) {
    logger.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
};

startBot();

process.on('SIGINT', () => {
  logger.info('📴 Завершение работы...');
  bot.stop('SIGINT');
});

process.on('SIGTERM', () => {
  logger.info('📴 Завершение работы...');
  bot.stop('SIGTERM');
});

module.exports = bot;

/**
 * 🖤 ПОВСЕДНЕВНЫЙ КВЕСТ - Telegram Bot
 * Для циничных бизнесменов, которые ненавидят свою работу
 * 
 * Главный файл: bot.js
 */

const { Telegraf, session } = require('telegraf');
const dotenv = require('dotenv');
const winston = require('winston');
const admin = require('firebase-admin');
const axios = require('axios');

// Загрузить переменные окружения
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
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// ==================== FIREBASE ====================

try {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG),
  });
  const db = admin.firestore();
  logger.info('✅ Firebase инициализирован');
} catch (error) {
  logger.error('❌ Ошибка Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

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

ПРИМЕРЫ ЯЗЫКА:
- "захерачить дракона" = сделать сложную задачу
- "накормить акулу" = поговорить с клиентом
- "облагородить ложь" = сделать красивый отчет
- "спастись от палачей" = пережить совещание

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста, БЕЗ комментариев. Грубый, циничный, черный юмор.`,

  startup: `Ты мастер квестов для людей, которые добровольно вышли в боевые действия без защиты и зарплаты.

ЗАДАЧА: Превратить задачу стартапера в квест про выживание в условиях хаоса с черным юмором.

ПРАВИЛА:
1. Язык: стартап-культура, недосыпание, неопределенность, pivots
2. Черный юмор про отсутствие денег, sleep deprivation
3. Враги: конкуренты, инвесторы, код, сроки, собственный организм
4. Реалистичность: это боевой приказ, не мотивация

ПРИМЕРЫ ЯЗЫКА:
- "Зажать инвестора" = получить финансирование
- "Завалить питч" = выступить перед VCs
- "Натравить фичу" = запустить фичу в боевых условиях
- "Выложиться на 200%" = работать за двоих

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста.`,

  corporate_war: `Ты стратег древних сражений в мире бизнеса, где каждый совещание — это подготовка к броску в спину.

ЗАДАЧА: Описать корпоративную задачу как стратегический ход в многоуровневой игре политики.

ПРАВИЛА:
1. Язык: стратегия, политика, подводные течения, фракции
2. Враги: коллеги, конкурирующие отделы, власть, время
3. Реальность: большие компании медленнее, но опаснее
4. Черный юмор про бюрократию, политику, бесполезные совещания

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста.`,
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Получить текущего пользователя из Firebase
 */
async function getUser(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    if (!userDoc.exists) {
      return null;
    }
    return userDoc.data();
  } catch (error) {
    logger.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Создать или обновить пользователя
 */
async function createOrUpdateUser(userId, userData) {
  try {
    const userRef = db.collection('users').doc(userId.toString());
    const currentUser = await userRef.get();

    if (!currentUser.exists) {
      // Новый пользователь
      await userRef.set({
        userId,
        name: userData.first_name || 'Аноним',
        username: userData.username || `user_${userId}`,
        level: 1,
        xp: 0,
        totalQuestsCompleted: 0,
        badges: ['Первый день'],
        theme: 'corporate',
        settings: {
          reminderTime: '19:00',
          language: 'ru',
          weeklyReportDay: 'sunday',
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streak: 0,
      });
      logger.info(`✅ Новый пользователь: ${userId}`);
      return true;
    } else {
      // Обновить существующего
      await userRef.update({
        lastActiveAt: new Date(),
      });
      return false;
    }
  } catch (error) {
    logger.error('Ошибка создания/обновления пользователя:', error);
    return null;
  }
}

/**
 * Генерировать сюжет через ChatGPT
 */
async function generateQuestStory(taskDescription, theme = 'corporate') {
  try {
    const promptTemplate = PROMPTS[theme] || PROMPTS.corporate;
    const prompt = promptTemplate.replace('{TASK}', taskDescription);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты создатель квестов с черным юмором для бизнесменов.',
          },
          {
            role: 'user',
            content: prompt,
          },
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

    const story = response.data.choices[0].message.content.trim();
    logger.info(`✅ Сюжет сгенерирован: ${taskDescription}`);
    return story;
  } catch (error) {
    logger.error('❌ Ошибка ChatGPT:', error.message);

    // Fallback story
    const fallbackStories = {
      corporate: `Облагородь эту задачу так, чтобы выглядело честным. 
      Используй много слов и мало смысла. Босс не заметит разницы.`,
      startup: `Доделай это за ночь. Кофе номер 5 поможет. 
      Или нет. Но делай всё равно.`,
      corporate_war: `Это часть стратегии. Может выиграешь, может проиграешь. 
      Но выглядеть должен уверенно.`,
    };

    return fallbackStories[theme] || fallbackStories.corporate;
  }
}

/**
 * Создать новый квест
 */
async function createQuest(userId, taskDescription) {
  try {
    const user = await getUser(userId);
    if (!user) {
      return null;
    }

    const story = await generateQuestStory(taskDescription, user.theme);

    // Определить XP в зависимости от длины описания
    const words = taskDescription.split(' ').length;
    let xp = 15;
    if (words < 5) xp = 10;
    else if (words > 20) xp = 30;

    const questId = `quest_${userId}_${Date.now()}`;
    const questRef = db.collection('quests').doc(questId);

    await questRef.set({
      questId,
      userId: userId.toString(),
      title: taskDescription,
      story,
      xp,
      completed: false,
      theme: user.theme,
      createdAt: new Date(),
      completedAt: null,
    });

    logger.info(`✅ Квест создан: ${questId}`);
    return {
      id: questId,
      title: taskDescription,
      story,
      xp,
    };
  } catch (error) {
    logger.error('❌ Ошибка создания квеста:', error);
    return null;
  }
}

/**
 * Получить активные квесты пользователя
 */
async function getActiveQuests(userId) {
  try {
    const snapshot = await db
      .collection('quests')
      .where('userId', '==', userId.toString())
      .where('completed', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const quests = [];
    snapshot.forEach((doc) => {
      quests.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return quests;
  } catch (error) {
    logger.error('❌ Ошибка получения квестов:', error);
    return [];
  }
}

/**
 * Завершить квест (ИСПРАВЛЕНО)
 */
async function completeQuest(userId, questId) {
  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      return { success: false, error: 'Квест не найден' };
    }

    const quest = questDoc.data();

    // Проверить, что это квест пользователя
    if (quest.userId !== userId.toString()) {
      return { success: false, error: 'Это не твой квест!' };
    }

    if (quest.completed) {
      return { success: false, error: 'Этот квест уже выполнен' };
    }

    // Обновить квест
    await questRef.update({
      completed: true,
      completedAt: new Date(),
    });

    // Обновить пользователя (добавить XP)
    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    const user = userDoc.data();

    const newXp = user.xp + quest.xp;
    const newLevel = Math.floor(newXp / 300) + 1;

    await userRef.update({
      xp: newXp,
      level: newLevel,
      totalQuestsCompleted: user.totalQuestsCompleted + 1,
      lastActiveAt: new Date(),
    });

    // Логировать событие
    await db.collection('analytics').add({
      userId: userId.toString(),
      event: 'quest_completed',
      questId,
      xpGained: quest.xp,
      newLevel,
      timestamp: new Date(),
    });

    logger.info(`✅ Квест выполнен: ${questId}, XP: +${quest.xp}`);

    return {
      success: true,
      xpGained: quest.xp,
      newXp,
      newLevel,
      questTitle: quest.title,
    };
  } catch (error) {
    logger.error('❌ Ошибка завершения квеста:', error);
    return { success: false, error: 'Ошибка сохранения' };
  }
}

// ==================== КОМАНДЫ БОТА ====================

/**
 * /start - Приветствие и регистрация
 */
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const isNew = await createOrUpdateUser(userId, ctx.from);

  const welcomeMessage = `
🖤 Добро пожаловать в "Повседневный квест"

Твой рабочий день превращается в опасную игру выживания. 
Каждая скучная задача становится эпическим квестом. 
Потому что без чувства юмора ты просто помрёшь.

📊 Твой статус:
Уровень: 1 | XP: 0/300
Статус: Наивный новичок 💀

🎯 Что ты можешь делать:
/addtask [описание] — превратить задачу в квест
/quests — посмотреть все текущие квесты
/done [номер] — отметить квест выполненным
/profile — посмотреть твой профиль
/stats — детальная статистика
/help — справка по всем командам

Давай начнём. Создай свой первый квест:
/addtask Согласовать договор
  `;

  await ctx.reply(welcomeMessage);

  if (isNew) {
    logger.info(`✅ Новый пользователь: ${userId}`);
  }
});

/**
 * /addtask [описание] - Создать новый квест
 */
bot.command('addtask', async (ctx) => {
  const userId = ctx.from.id;
  const taskDescription = ctx.message.text.replace('/addtask ', '').trim();

  if (!taskDescription) {
    await ctx.reply(
      '📝 Напиши описание задачи:\n/addtask Переделать презентацию'
    );
    return;
  }

  await ctx.reply('⏳ Генерирую сюжет... ChatGPT тоже выгорает 🖤');

  const quest = await createQuest(userId, taskDescription);

  if (!quest) {
    await ctx.reply('❌ Ошибка создания квеста. Попробуй позже.');
    return;
  }

  const questMessage = `
✅ КВЕСТ СОЗДАН! (Приказ от начальства эпичной прокачки)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 СЮЖЕТ:
${quest.story}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 НАГРАДА: +${quest.xp} XP
⏱️ СТАТУС: Активен

Выполни: /quests чтобы увидеть все квесты
Завершить: /done [номер]
  `;

  await ctx.reply(questMessage);
});

/**
 * /quests - Показать активные квесты (ИСПРАВЛЕНО)
 */
bot.command('quests', async (ctx) => {
  const userId = ctx.from.id;

  const quests = await getActiveQuests(userId);

  if (quests.length === 0) {
    await ctx.reply(
      '📭 У тебя нет активных квестов!\nСоздай первый: /addtask Описание твоей задачи'
    );
    return;
  }

  let message = `📋 ТВИ НЕВЫПОЛНЕННЫЕ ОБЯЗАТЕЛЬСТВА (${quests.length})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  quests.forEach((quest, index) => {
    const difficultyStars = '⭐'.repeat(
      Math.min(Math.floor(quest.xp / 20), 5)
    );
    message += `${index + 1}️⃣ 💀 ${quest.title}\n`;
    message += `"${quest.story.substring(0, 80)}..."\n`;
    message += `Награда: ${quest.xp} XP | ${difficultyStars}\n`;
    message += `→ Выполнить: /done ${index + 1}\n`;
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `\n🎯 Выполни квест командой: /done [номер]\n`;
  message += `Пример: /done 1\n\n`;
  message += `[Добавить ещё боль] /addtask`;

  await ctx.reply(message);
});

/**
 * /done [номер] - Завершить квест (ИСПРАВЛЕНО)
 */
bot.command('done', async (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.replace('/done ', '').trim();

  if (!args) {
    const quests = await getActiveQuests(userId);
    if (quests.length === 0) {
      await ctx.reply('📭 Нет квестов для завершения');
      return;
    }

    let message = 'Выбери квест для завершения:\n\n';
    quests.forEach((quest, index) => {
      message += `/done ${index + 1} - ${quest.title}\n`;
    });

    await ctx.reply(message);
    return;
  }

  // Получить номер квеста
  const questNumber = parseInt(args, 10);
  
  if (isNaN(questNumber) || questNumber < 1) {
    await ctx.reply('❌ Укажи правильный номер квеста.\nПример: /done 1');
    return;
  }

  // Получить список активных квестов
  const quests = await getActiveQuests(userId);
  
  if (questNumber > quests.length) {
    await ctx.reply(`❌ Квеста с номером ${questNumber} нет.\nУ тебя всего ${quests.length} квестов.`);
    return;
  }

  // Получить квест по номеру (индекс = номер - 1) - ИСПРАВЛЕНО
  const selectedQuest = quests[questNumber - 1];
  const questId = selectedQuest.id; // Используем реальный ID из Firestore

  // Завершить квест
  const result = await completeQuest(userId, questId);

  if (!result.success) {
    await ctx.reply(`❌ ${result.error}`);
    return;
  }

  const completeMessage = `
🎉 КВЕСТ ВЫПОЛНЕН! (против всех шансов)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${result.questTitle}
"Ты пережил это. Это все, что имеет значение."

✨ +${result.xpGained} XP за выживание!

📊 Твой прогресс:
   Уровень ${result.newLevel}: ${result.newXp} XP
   Всего выполнено: твоя компетенция растет
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ещё /addtask или отдыхай?
  `;

  await ctx.reply(completeMessage);
});

/**
 * /profile - Профиль пользователя
 */
bot.command('profile', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.reply('❌ Пользователь не найден. Напиши /start');
    return;
  }

  const badgesStr = user.badges.join(', ') || 'Нет';

  const profileMessage = `
👤 ПРОФИЛЬ: ${user.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ОСНОВНЫЕ СТАТИСТИКИ
Уровень: ${user.level} ${'💀'.repeat(Math.min(user.level, 5))}
Опыт: ${user.xp}/${user.level * 300} XP (${Math.round(
    (user.xp % 300) / 3
  )}%)

📈 ПРОГРЕСС
✅ Всего квестов: ${user.totalQuestsCompleted}
🔥 Streak: ${user.streak} дней подряд

🏆 БЕЙДЖИ (${user.badges.length})
${badgesStr}

⚙️ НАСТРОЙКИ
🎨 Тема: ${user.theme}
🔔 Напоминания: ${user.settings.reminderTime}
🌍 Язык: ${user.settings.language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Статистика] /stats [Помощь] /help
  `;

  await ctx.reply(profileMessage);
});

/**
 * /stats - Детальная статистика
 */
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.reply('❌ Пользователь не найден');
    return;
  }

  const statsMessage = `
📊 ДЕТАЛЬНАЯ СТАТИСТИКА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ${user.name}
Уровень: ${user.level}
Всего XP: ${user.xp}
Квестов выполнено: ${user.totalQuestsCompleted}

📈 ЭФФЕКТИВНОСТЬ
Success Rate: ${user.totalQuestsCompleted > 0 ? '95%' : '0%'}
(Если ты здесь, значит, ты что-то делаешь)

🎯 АКТИВНОСТЬ
Дней в игре: ${Math.floor(
    (new Date() - user.createdAt.toDate()) / (1000 * 60 * 60 * 24)
  )}
Последняя активность: только что
Текущий streak: ${user.streak} дней

💡 СОВЕТ:
Больше квестов → больше XP → больше уровней → 
новые темы → еще больнее ржать 🖤

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Лидерборд] /leaderboard [Главное меню] /start
  `;

  await ctx.reply(statsMessage);
});

/**
 * /leaderboard - Глобальный лидерборд
 */
bot.command('leaderboard', async (ctx) => {
  try {
    const snapshot = await db
      .collection('users')
      .orderBy('xp', 'desc')
      .limit(10)
      .get();

    let message =
      '🏆 ГЛОБАЛЬНЫЙ ЛИДЕРБОРД СТРАДАНИЙ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    const medals = ['🥇', '🥈', '🥉'];
    let position = 1;

    snapshot.forEach((doc) => {
      const user = doc.data();
      const medal = medals[position - 1] || `${position}.`;
      message += `${medal} ${user.name.substring(0, 15)} | Ур. ${user.level} | ${user.xp} XP\n`;
      position++;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Ты видишь эти цифры? Это боль, облаченная в XP.\n`;

    await ctx.reply(message);
  } catch (error) {
    logger.error('Ошибка лидерборда:', error);
    await ctx.reply('❌ Ошибка загрузки лидерборда');
  }
});

/**
 * /help - Справка
 */
bot.command('help', async (ctx) => {
  const helpMessage = `
❓ СПРАВКА ПО КОМАНДАМ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 УПРАВЛЕНИЕ КВЕСТАМИ:
/addtask [описание] — создать квест
/quests — список текущих квестов
/done [номер] — отметить выполненным

👤 ПРОФИЛЬ И ПРОГРЕСС:
/profile — мой профиль
/stats — детальная статистика

🏆 ОБЩЕСТВЕННОЕ:
/leaderboard — глобальный лидерборд
/daily — ежедневный челлендж (скоро)

⚙️ ПРОЧЕЕ:
/settings — настройки
/help — эта справка

💡 СОВЕТЫ:
• Черный юмор = способ справиться
• Каждый квест приносит XP
• Новые уровни = новые темы
• Не забывай выполнять квесты 🖤

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Вопросы? /feedback
  `;

  await ctx.reply(helpMessage);
});

/**
 * /feedback - Обратная связь
 */
bot.command('feedback', async (ctx) => {
  const userId = ctx.from.id;
  const feedback = ctx.message.text.replace('/feedback ', '').trim();

  if (!feedback) {
    await ctx.reply('💬 Напиши твой отзыв:\n/feedback Твой текст');
    return;
  }

  try {
    await db.collection('feedback').add({
      userId: userId.toString(),
      text: feedback,
      timestamp: new Date(),
    });

    await ctx.reply(
      '✅ Спасибо! 🙏 Твой отзыв получен.\nОн поможет нам сделать это еще более циничным.'
    );

    logger.info(`Feedback получен от ${userId}: ${feedback}`);
  } catch (error) {
    logger.error('Ошибка сохранения feedback:', error);
    await ctx.reply('❌ Ошибка при сохранении отзыва');
  }
});

/**
 * На случай неправильной команды
 */
bot.on('text', async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    await ctx.reply(
      '❌ Команда не найдена.\n\nИспользуй /help для справки или /addtask для создания квеста'
    );
  }
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  logger.error('Ошибка бота:', err);
  try {
    ctx.reply('❌ Произошла ошибка. Попробуй позже.');
  } catch (e) {
    logger.error('Ошибка отправки сообщения об ошибке:', e);
  }
});

// ==================== ЗАПУСК ====================

const startBot = async () => {
  try {
    await bot.launch();
    logger.info('🚀 Бот запущен и готов к работе!');
    logger.info(
      `🔗 Доступен по адресу: https://t.me/${(await bot.telegram.getMe()).username}`
    );
  } catch (error) {
    logger.error('❌ Ошибка запуска бота:', error);
    process.exit(1);
  }
};

startBot();

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGINT', () => {
  logger.info('📴 Завершение работы бота...');
  bot.stop('SIGINT');
});

process.on('SIGTERM', () => {
  logger.info('📴 Завершение работы бота...');
  bot.stop('SIGTERM');
});

module.exports = bot;

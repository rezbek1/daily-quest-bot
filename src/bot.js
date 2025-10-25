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
const cron = require('node-cron');
const moment = require('moment-timezone');

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

// ==================== ПЛАНИРОВЩИК НАПОМИНАНИЙ ====================

/**
 * Функция отправки напоминаний пользователям
 */
async function sendReminders() {
  try {
    logger.info('🔍 ЗАПУСК ПРОВЕРКИ НАПОМИНАНИЙ');
    
    // Получить всех пользователей
    const usersSnapshot = await db.collection('users').get();
    logger.info(`📊 Всего пользователей: ${usersSnapshot.docs.length}`);
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const reminderTime = user.settings?.reminderTime;
      const timezone = user.settings?.timezone || 'Europe/Moscow';
      
      logger.info(`👤 Проверяю ${user.name}: время ${reminderTime}, зона ${timezone}`);
      
      // Проверить совпадает ли время напоминания
      if (!reminderTime) {
        logger.info(`⏭️ Пропускаю ${user.name}: нет времени напоминания`);
        continue;
      }
      
      // Получить текущее время в timezone пользователя
      const userNow = moment().tz(timezone);
      const userHour = String(userNow.hours()).padStart(2, '0');
      const userMinute = String(userNow.minutes()).padStart(2, '0');
      const [reminderHour] = reminderTime.split(':');
      
      logger.info(`⏰ ${user.name}: текущее время ${userHour}:${userMinute}, ожидается ${reminderHour}:xx`);
      
      // Проверить совпадает ли час
      if (reminderHour !== userHour) {
        logger.info(`❌ ${user.name}: час не совпадает (${reminderHour} !== ${userHour})`);
        continue;
      }
      
      logger.info(`✅ ${user.name}: час совпадает! Проверяю активные квесты...`);
      
      // Если время совпало - проверить есть ли активные квесты
      const activeQuests = await getActiveQuests(user.userId || userDoc.id);
      logger.info(`📋 ${user.name}: активных квестов: ${activeQuests?.length || 0}`);
      
      if (activeQuests && activeQuests.length > 0) {
        // Есть активные квесты - отправить напоминание
        try {
          const userCurrentTime = userNow.format('HH:mm');
          
          const reminderMessage = `🔔 НАПОМИНАНИЕ О КВЕСТАХ

⏰ Время: ${userCurrentTime} (${timezone})
📋 Активных квестов: ${activeQuests.length}

Вот что ждёт:
${activeQuests.slice(0, 3).map((q, i) => `${i + 1}. ${q.title}`).join('\n')}
${activeQuests.length > 3 ? `\n... и ещё ${activeQuests.length - 3}` : ''}

➡️ Давай, выполнять! /quests`;
          
          await bot.telegram.sendMessage(user.userId || userDoc.id, reminderMessage);
          logger.info(`✅ Напоминание отправлено ${user.name} в ${userCurrentTime} (${timezone})`);
        } catch (error) {
          logger.warn(`⚠️ Ошибка отправки напоминания ${user.name}: ${error.message}`);
        }
      } else {
        logger.info(`⏭️ ${user.name}: нет активных квестов`);
      }
    }
    
    logger.info('✅ ПРОВЕРКА НАПОМИНАНИЙ ЗАВЕРШЕНА');
  } catch (error) {
    logger.error('❌ Ошибка при отправке напоминаний:', error);
  }
}

/**
 * Запуск планировщика напоминаний с cron
 */
function startReminderScheduler() {
  try {
    logger.info('🚀 ИНИЦИАЛИЗИРУЮ ПЛАНИРОВЩИК...');
    
    // Запускать каждую минуту (проверяет напоминания для каждого пользователя в их временных поясах)
    const job = cron.schedule('* * * * *', async () => {
      await sendReminders();
    });
    
    logger.info('✅✅✅ ПЛАНИРОВЩИК УСПЕШНО ЗАПУЩЕН ✅✅✅');
    logger.info('⏰ Проверка напоминаний: каждую минуту для каждого часового пояса');
    
    return job;
  } catch (error) {
    logger.error('❌ Ошибка инициализации планировщика:', error);
  }
}

// ==================== PROMPTS FOR CHATGPT ====================

const PROMPTS = {
  light: `Ты создатель забавных квестов для предпринимателей, которые ещё не потеряли надежду.

ТВОЯ ЗАДАЧА: Превратить бизнес-задачу в весёлый квест с лёгким сарказмом.
Юмор мягкий, позитивный, но всё ещё циничный.

ПРАВИЛА:
1. Максимум 3 предложения (150 слов)
2. Лёгкий юмор, шутки, намеки на боль (но не слишком жёсткие)
3. Язык: весёлый, но реалистичный
4. Враги: сложные, но преодолимые
5. НЕ включай: чёрный юмор, жёсткость, отчаяние
6. ВКЛЮЧАЙ: оптимизм, забаву, лёгкость

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста, БЕЗ комментариев. Смешной, но добрый юмор.`,

  black: `Ты создатель квестов для взрослых предпринимателей, которые знают реальность.

ТВОЯ ЗАДАЧА: Превратить бизнес-задачу в квест с ЧЁРНЫМ ЮМОРОМ.
Без сахара, без позитива. Циничный, острый, язвительный.

ПРАВИЛА:
1. Максимум 3 предложения (150 слов)
2. Чёрный юмор, сарказм, цинизм ПРИВЕТСТВУЕТСЯ
3. Реальность: deadline = смерть, клиент = враг, совещание = казнь
4. Враги: начальник, клиенты, сроки, коллеги, твой организм
5. НЕ включай: реальное насилие, сексизм
6. ВКЛЮЧАЙ: циничность, мрак, реалистичность

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста, БЕЗ комментариев. Жесткий чёрный юмор.`,

  venture: `Ты инвестор после провала питча, который разговаривает с предпринимателем о его текущей задаче.

ТВОЯ ЗАДАЧА: Описать бизнес-задачу как суровую реальность венчурного дна.
МАКСИМУМ боли, честности и беспощадности. Это мотивация через страх.

ПРАВИЛА:
1. Максимум 3 предложения (150 слов)
2. МАКСИМУМ сарказма, чёрного юмора и жёсткости
3. Язык: как инвестор, который потерял терпение
4. Враги: конкуренты на \$200M, время, деньги, твоя лень, твой страх
5. Реальность: ошибка = банкротство, медлительность = смерть, неудача = позор
6. ВКЛЮЧАЙ: боль, отчаяние, реальность, мотивацию через страх

ЗАДАЧА: {TASK}

Напиши ТОЛЬКО текст квеста, БЕЗ комментариев. Беспощадно честный квест.`,

  quote: `Ты создатель остроумных цитат для предпринимателей, которые знают реальность.

ТВОЯ ЗАДАЧА: Создать ОДНУ короткую, язвительную цитату про жизнь предпринимателя.
Максимум 2 строки. Язык: чёрный юмор, циничный, беспощадно честный.

ПРИМЕРЫ СТИЛЯ:
- "KPI не врут. Врёшь ты."
- "Успешный предприниматель - это тот, кто научился скрывать панику"
- "Стартап - это когда ты платишь деньги, чтобы работать 24/7"
- "Инвестор спросит 'Где преимущество?' Ответ: 'Денег нет, остальное есть'"
- "Дедлайн - это когда ты понимаешь, что ошибся в выборе профессии"
- "Бизнес-план - это красивая история о том, как ты потеряешь свои деньги"

ПРАВИЛА:
1. ОДНА цитата, максимум 2 строки
2. Максимум сарказма и чёрного юмора
3. Про бизнес, предпринимательство, стартапы, деньги, инвесторов
4. Беспощадно честно
5. НЕ включай: политику, реальное насилие, сексизм

Напиши ТОЛЬКО цитату, БЕЗ кавычек, БЕЗ автора, БЕЗ комментариев.`,
};


// ==================== UTILITY FUNCTIONS ====================

/**
 * Миграция данных пользователя - добавить недостающие поля
 */
async function migrateUserData(userId) {
  try {
    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const user = userDoc.data();
    const updates = {};
    
    // Проверить activityLog
    if (!user.activityLog) {
      updates.activityLog = [];
      logger.info(`📋 Добавлен activityLog для ${userId}`);
    }
    
    // Проверить streak
    if (user.streak === undefined || user.streak === null || user.streak === 0) {
      // Если есть квесты выполненные - начать streak с 1
      if (user.totalQuestsCompleted > 0) {
        updates.streak = 1;
      } else {
        updates.streak = 0;
      }
      logger.info(`🔥 Инициализирован streak для ${userId}: ${updates.streak}`);
    }
    
    // Если есть обновления - применить их
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
      logger.info(`✅ Миграция завершена для ${userId}`, updates);
    }
  } catch (error) {
    logger.error('Ошибка миграции данных:', error);
  }
}

/**
 * Получить пользователя с миграцией
 */
async function getUser(userId) {
  try {
    // Сначала мигрировать данные если нужно
    await migrateUserData(userId);
    
    // Потом получить пользователя
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
        theme: 'black',
        settings: { reminderTime: '19:00', language: 'ru', weeklyReportDay: 'sunday', timezone: 'Europe/Moscow' },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streak: 1,
        activityLog: [{
          date: new Date().toDateString(),
          questsCompleted: 0,
          xpGained: 0,
          timestamp: new Date()
        }],
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

/**
 * Обновить streak пользователя
 */
async function updateStreak(userId) {
  try {
    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    const user = userDoc.data();
    
    if (!user) return;
    
    const today = new Date().toDateString();
    const lastActive = user.lastActiveAt?.toDate?.()?.toDateString?.();
    
    let newStreak = user.streak || 1;
    
    // Если это новый день
    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (lastActive === yesterday) {
        // Вчера была активность - продолжить серию
        newStreak = (user.streak || 1) + 1;
      } else {
        // Был перерыв - начать заново
        newStreak = 1;
      }
    }
    
    await userRef.update({
      streak: newStreak,
      lastActiveAt: new Date()
    });
    
    logger.info(`✅ Streak обновлен для ${userId}: ${newStreak} дней`);
    return newStreak;
  } catch (error) {
    logger.error('Ошибка обновления streak:', error);
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



async function generateDailyQuote() {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Ты создатель язвительных цитат для предпринимателей.' },
          { role: 'user', content: PROMPTS.quote },
        ],
        max_tokens: 100,
        temperature: 0.9,
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
    logger.error('❌ Ошибка генерации цитаты:', error.message);
    const fallbackQuotes = [
      'KPI не врут. Врёшь ты.',
      'Успешный предприниматель - это тот, кто научился скрывать панику.',
      'Стартап - это когда ты платишь деньги, чтобы работать 24/7.',
      'Бизнес-план - это красивая история о том, как ты потеряешь свои деньги.',
      'Дедлайн - это когда ты понимаешь, что ошибся в выборе профессии.',
    ];
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
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
    
    // Обновить streak
    const newStreak = await updateStreak(userId);
    
    // Подготовить activityLog
    const today = new Date().toDateString();
    const activityLog = user.activityLog || [];
    const todayLog = activityLog.find(log => log.date === today);
    
    if (todayLog) {
      todayLog.questsCompleted += 1;
      todayLog.xpGained += quest.xp;
      todayLog.quests = todayLog.quests || [];
      todayLog.quests.push(quest.title);
    } else {
      activityLog.push({
        date: today,
        questsCompleted: 1,
        xpGained: quest.xp,
        quests: [quest.title],
        timestamp: new Date()
      });
    }

    await userRef.update({
      xp: newXp, 
      level: newLevel, 
      totalQuestsCompleted: user.totalQuestsCompleted + 1,
      streak: newStreak,
      lastActiveAt: new Date(),
      activityLog: activityLog
    });

    await db.collection('analytics').add({
      userId: userId.toString(), event: 'quest_completed', questId,
      xpGained: quest.xp, newLevel, timestamp: new Date(),
    });

    logger.info(`✅ Квест #${quest.questNumber} выполнен: ${questId}, XP: +${quest.xp}, Streak: ${newStreak}`);
    return {
      success: true, xpGained: quest.xp, newXp, newLevel, newStreak,
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
      Markup.button.callback('🏆 Лидерборд', 'menu_leaderboard'),
      Markup.button.callback('❓ Помощь', 'menu_help'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu_settings'),
      Markup.button.callback('🏠 На главную', 'menu_home'),
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


  const welcomeMessage = `🖤 TELEGRAM-БОТ ВЫЖИВАНИЯ ДЛЯ ПРЕДПРИНИМАТЕЛЯ

Telegram-бот, который превращает предпринимательскую рутину в черную комедию.

Ты строишь бизнес, а ощущаешь, что строишь себе нервный срыв? 
Бот превращает каждую задачу, звонок и презентацию в квест выживания с язвительным сарказмом. 
Теперь KPI не просто цифры — это боссы, которых нужно победить.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ЧТО ТЫ ПОЛУЧАЕШЬ:

1️⃣ ПРЕОБРАЗОВАНИЕ БИЗ-ДЕЛ В КВЕСТЫ
Ты пишешь: "позвонить клиенту" 
Бот отвечает: "Миссия: Договори и выживи"

2️⃣ РЕЖИМЫ ДЛЯ РАЗНЫХ ТИПОВ БЕЗУМИЯ
💼 Корпоративный — совещания, где никто не читал повестку
🚀 Стартап — MVP из кода, кофе и самообмана
⚔️ Битва отделов — договорись с тремя врагами

3️⃣ ЕЖЕДНЕВНЫЕ МИССИИ
"Продай мечту, не потеряв совесть"
"Выслушай клиента, который 'только спросить'"

4️⃣ СИСТЕМА ДОСТИЖЕНИЙ
✨ "Основатель без паники"
✨ "Мастер холодных звонков"
✨ "Святой терпения и дедлайнов"

5️⃣ БИЗНЕС-СТАТИСТИКА
📊 Индекс выгорания
📊 Уровень сарказма
📊 Шанс дожить до IPO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Твой статус:
Уровень: 1 | XP: 0/300
Статус: Наивный основатель 💀

➡️ Выбери действие или введи /addtask`;


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

  let message = `📋 АКТИВНЫЕ КВЕСТЫ (${quests.length})\n`;
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

/**
 * /reminder_test - ТЕСТОВАЯ ОТПРАВКА НАПОМИНАНИЯ
 */
bot.command('reminder_test', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);
  
  if (!user) {
    await ctx.reply('❌ Пользователь не найден');
    return;
  }
  
  await ctx.reply('🧪 Запускаю тестовую отправку напоминания...');
  logger.info(`🧪 ТЕСТОВАЯ ОТПРАВКА для ${user.name}`);
  
  // Получить активные квесты
  const activeQuests = await getActiveQuests(userId);
  logger.info(`📋 Найдено активных квестов: ${activeQuests?.length || 0}`);
  
  if (!activeQuests || activeQuests.length === 0) {
    await ctx.reply('❌ У тебя нет активных квестов. Создай сначала квест!');
    return;
  }
  
  try {
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
    
    await bot.telegram.sendMessage(userId, reminderMessage, getMainMenuKeyboard());
    await ctx.reply('✅ Тестовое напоминание отправлено!');
    logger.info(`✅ Тестовое напоминание отправлено ${user.name}`);
  } catch (error) {
    await ctx.reply(`❌ Ошибка: ${error.message}`);
    logger.error(`❌ Ошибка тестовой отправки: ${error.message}`);
  }
});


/**
 * /test - ПРОСТОЙ ТЕСТ
 */
bot.command('test', async (ctx) => {
  logger.info('🧪 КОМАНДА /TEST ПОЛУЧЕНА!');
  
  try {
    logger.info('🤖 Пытаюсь отправить ответ...');
    await ctx.reply('✅ БОТ РАБОТАЕТ!');
    logger.info('✅ Ответ отправлен успешно');
  } catch (error) {
    logger.error('❌ ОШИБКА ОТПРАВКИ:', error.message);
  }
});

/**
 * Тестирование напоминаний
 */
bot.command('test_reminder', async (ctx) => {
  const userId = ctx.from.id;
  logger.info(`🧪 КОМАНДА /TEST_REMINDER от ${userId}`);
  
  try {
    // Получить активные квесты пользователя
    const activeQuests = await getActiveQuests(userId);
    
    if (!activeQuests || activeQuests.length === 0) {
      await ctx.reply('❌ У вас нет активных квестов для напоминания');
      return;
    }
    
    // Создать напоминание
    const reminderMessage = `🔔 ТЕСТОВОЕ НАПОМИНАНИЕ О КВЕСТАХ

⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}
📋 Активных квестов: ${activeQuests.length}

Вот что ждёт:
${activeQuests.slice(0, 3).map((q, i) => `${i + 1}. ${q.title}`).join('\n')}
${activeQuests.length > 3 ? `\n... и ещё ${activeQuests.length - 3}` : ''}

➡️ Давай, выполнять! /quests`;
    
    await ctx.reply(reminderMessage);
    logger.info(`✅ Тестовое напоминание отправлено ${userId}`);
    
  } catch (error) {
    logger.error('❌ Ошибка тестирования напоминания:', error.message);
    await ctx.reply('❌ Ошибка при отправке напоминания');
  }
});

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

🧪 ТЕСТИРОВАНИЕ:
/test — проверить что бот работает
/test_reminder — тестовое напоминание

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
 * Кнопки главного меню - ВЫПОЛНЯЮТ ЛОГИКУ
 */


bot.action('menu_add', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.waitingForTask = true;
  await ctx.reply('📝 Введите описание задачи:\n\nПример: "позвонить клиенту"', 
    Markup.keyboard([['❌ Отмена']]).resize());
  await ctx.answerCbQuery();
});


bot.action('menu_quests', async (ctx) => {
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
  await ctx.answerCbQuery();
});

bot.action('menu_profile', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  // Показать последнюю неделю активности
  const activityLog = user.activityLog || [];
  const lastWeek = activityLog.slice(-7).reverse();
  
  let historyText = '';
  if (lastWeek.length > 0) {
    historyText = '\n📅 ИСТОРИЯ (7 ДНЕЙ)\n';
    lastWeek.forEach(day => {
      historyText += `${day.date}: ${day.questsCompleted} квестов (+${day.xpGained} XP)\n`;
    });
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
${historyText}
⚙️ НАСТРОЙКИ
🎨 Тема: ${user.theme}
🔔 Напоминания: ${user.settings.reminderTime}
🌍 Язык: ${user.settings.language}`;

  await ctx.reply(profileMessage, getMainMenuKeyboard());
  await ctx.answerCbQuery();
});

bot.action('menu_stats', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);
  const activeQuests = await getActiveQuests(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
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
  await ctx.answerCbQuery();
});

/**
 * Меню настроек
 */
bot.action('menu_settings', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  const settingsMessage = `⚙️ НАСТРОЙКИ УРОВНЯ БОЛИ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

😅 УРОВЕНЬ БОЛИ
Текущий: ${user.theme === 'light' ? '😅 Лёгкий' : user.theme === 'black' ? '💀 Чёрный юмор' : '🔥 Венчурное дно'}

Выбери уровень сарказма ↓

🔔 ВРЕМЯ НАПОМИНАНИЙ
Текущее время: ${user.settings.reminderTime}

Выбери время ↓

🌍 ЧАСОВОЙ ПОЯС
Текущий: ${user.settings.timezone || 'Europe/Moscow'}

Выбери пояс ↓`;

  const themeKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('😅 Лёгкий', 'set_pain_light'),
      Markup.button.callback('💀 Чёрный', 'set_pain_black'),
    ],
    [Markup.button.callback('🔥 Венчурное дно', 'set_pain_venture')],
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
    [
      Markup.button.callback('🌍 Часовые пояса', 'select_timezone'),
    ],
    ...getMainMenuKeyboard().reply_markup.inline_keyboard,
  ]);

  await ctx.reply(settingsMessage, themeKeyboard);
  await ctx.answerCbQuery();
});


/**
 * Смена уровня боли - Лёгкий
 */
bot.action('set_pain_light', async (ctx) => {
  const userId = ctx.from.id;
  try {
    await db.collection('users').doc(userId.toString()).update({ theme: 'light' });
    await ctx.answerCbQuery('✅ Уровень: 😅 Лёгкий', true);
    await ctx.reply('✅ Переключился на 😅 Лёгкий юмор!\n\nТеперь квесты будут веселее и добрее 😄', getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка смены уровня:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
});

/**
 * Смена уровня боли - Чёрный юмор
 */
bot.action('set_pain_black', async (ctx) => {
  const userId = ctx.from.id;
  try {
    await db.collection('users').doc(userId.toString()).update({ theme: 'black' });
    await ctx.answerCbQuery('✅ Уровень: 💀 Чёрный юмор', true);
    await ctx.reply('✅ Включился режим 💀 Чёрного юмора!\n\nДобро пожаловать в реальность 🖤', getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка смены уровня:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
});

/**
 * Смена уровня боли - Венчурное дно
 */
bot.action('set_pain_venture', async (ctx) => {
  const userId = ctx.from.id;
  try {
    await db.collection('users').doc(userId.toString()).update({ theme: 'venture' });
    await ctx.answerCbQuery('✅ Уровень: 🔥 Венчурное дно', true);
    await ctx.reply('✅ РЕЖИМ ИНВЕСТОРА ВКЛЮЧЕН 🔥\n\nТеперь я буду говорить как инвестор после провала питча.\n\nПриготовься к беспощадной честности 💀', getMainMenuKeyboard());
  } catch (error) {
    logger.error('Ошибка смены уровня:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
});

/**
 * Смена времени напоминаний
 */
const setReminderTime = (timeStr) => {
  return async (ctx) => {
    const userId = ctx.from.id;
    try {
      await db.collection('users').doc(userId.toString()).update({
        'settings.reminderTime': timeStr,
      });
      await ctx.answerCbQuery(`✅ Время: ${timeStr}`, true);
      await ctx.reply(`✅ Время напоминаний установлено на ${timeStr}!`, getMainMenuKeyboard());
    } catch (error) {
      logger.error('Ошибка смены времени:', error);
      await ctx.answerCbQuery('❌ Ошибка', true);
    }
  };
};

bot.action('set_time_08', setReminderTime('08:00'));
bot.action('set_time_12', setReminderTime('12:00'));
bot.action('set_time_17', setReminderTime('17:00'));
bot.action('set_time_19', setReminderTime('19:00'));
bot.action('set_time_21', setReminderTime('21:00'));
bot.action('set_time_23', setReminderTime('23:00'));


/**
 * Список часовых поясов
 */
const TIMEZONES = [
  'Europe/Moscow', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Shanghai', 'Asia/Tokyo'
];
/**
 * Меню выбора часового пояса
 */
bot.action('select_timezone', async (ctx) => {

  const tzKeyboard = Markup.inlineKeyboard(
    TIMEZONES.map(tz => [Markup.button.callback(tz, `tz_${tz}`)]),
    {
      columns: 2
    }
  );

  await ctx.reply('🌍 Выбери свой часовой пояс:', tzKeyboard);
  await ctx.answerCbQuery();
});

/**
 * Установка часового пояса
 */
TIMEZONES.forEach(tz => {
  bot.action(`tz_${tz}`, async (ctx) => {
    const userId = ctx.from.id;
    try {
      await db.collection('users').doc(userId.toString()).update({
        'settings.timezone': tz,
      });
      await ctx.reply(`✅ Часовой пояс установлен на ${tz}!`, getMainMenuKeyboard());
    } catch (error) {
      logger.error('Ошибка при установке timezone:', error);
      await ctx.reply('❌ Ошибка', getMainMenuKeyboard());
    }
    await ctx.answerCbQuery();
  });
});



bot.action('menu_help', async (ctx) => {
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
  await ctx.answerCbQuery();
});

/**
 * Быстрый статус пользователя
 */

/**
 * На главную - генерирует рандомную цитату дня
 */
bot.action('menu_home', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('❌ Ошибка', true);
    return;
  }

  const quote = await generateDailyQuote();
  const xpProgress = Math.round((user.xp % 300) / 3);

  const compactMessage = `💬 ЦИТАТА ДНЯ:
"${quote}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Твой статус:
Уровень: ${user.level} | XP: ${user.xp}/${user.level * 300} (${xpProgress}%)
Статус: ${user.name} 💀`;

  await ctx.reply(compactMessage, getMainMenuKeyboard());
  await ctx.answerCbQuery();
});



/**
 * Неправильные команды
 */

/**
 * Обработка нажатия кнопки "Отмена" при вводе задачи
 */
bot.hears('❌ Отмена', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.waitingForTask = false;
  await ctx.reply('❌ Отменено', getMainMenuKeyboard());
});

/**
 * Обработка ввода текста задачи
 */
bot.on('text', async (ctx) => {
  ctx.session = ctx.session || {};
  
  // Если в режиме ввода задачи
  if (ctx.session.waitingForTask) {
    const taskDescription = ctx.message.text;
    
    if (!taskDescription || taskDescription.length < 3) {
      await ctx.reply('⚠️ Описание задачи должно быть минимум 3 символа');
      return;
    }
    
    ctx.session.waitingForTask = false;
    
    const userId = ctx.from.id;
    const isNewUser = await createOrUpdateUser(userId, ctx.from);
    
    if (isNewUser) {
      await ctx.reply('👋 Добро пожаловать в БИЗНЕС-СИМУЛЯТОР ВЫЖИВАНИЯ!\n\n💼 Превращаем твой предпринимательский кошмар в черную комедию. KPI теперь враги, дедлайны — боссы, инвесторы — боги.\n\n🎯 Начни прямо сейчас: напиши свою первую задачу!', getMainMenuKeyboard());
    }
    
    await ctx.reply('⏳ Генерирую квест...', getMainMenuKeyboard());
    
    const quest = await createQuest(userId, taskDescription);
    if (!quest) {
      await ctx.reply('❌ Ошибка создания квеста', getMainMenuKeyboard());
      return;
    }
    
    const questMessage = `✨ НОВЫЙ КВЕСТ #${quest.questNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 ${quest.title}

${quest.story}

⭐ +${quest.xp} XP за выживание`;
    
    const questKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выполнено! #${quest.questNumber}`, `done_${quest.id}`)],
      [Markup.button.callback(`🗑️ Удалить #${quest.questNumber}`, `delete_${quest.id}`)],
      ...getMainMenuKeyboard().reply_markup.inline_keyboard,
    ]);
    
    await ctx.reply(questMessage, questKeyboard);
    return;
  }
  
  // Обычная обработка неправильных команд
  if (!ctx.message.text.startsWith('/')) {
    await ctx.reply(
      '❌ Команда не найдена.\n\nИспользуй кнопки или /help',
      getMainMenuKeyboard()
    );
  }
});

/**
 * 🏆 LEADERBOARD - Показать рейтинг
 */
async function showLeaderboard(ctx) {
  const userId = ctx.from.id;
  
  try {
    await ctx.answerCbQuery();
    
    const user = await getUser(userId);
    if (!user) {
      await ctx.reply('❌ Сначала создай хотя бы один квест!', getMainMenuKeyboard());
      return;
    }

    // Получить всех пользователей для сравнения
    const usersSnapshot = await db.collection('users').get();
    const allUsers = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      allUsers.push({
        userId: userData.userId,
        completed: userData.totalQuestsCompleted || 0,
        streak: userData.streak || 0,
      });
    });

    // Отсортировать по квестам
    allUsers.sort((a, b) => b.completed - a.completed);

    // Определить позицию текущего пользователя
    const userPosition = allUsers.findIndex(u => u.userId === userId);
    const totalUsers = allUsers.length;
    const percentile = Math.round((1 - userPosition / totalUsers) * 100);

    // Категоризировать пользователей
    const categories = {
      legend: allUsers.filter(u => u.completed >= 45),
      champion: allUsers.filter(u => u.completed >= 30 && u.completed < 45),
      star: allUsers.filter(u => u.completed >= 15 && u.completed < 30),
      rising: allUsers.filter(u => u.completed >= 5 && u.completed < 15),
    };

    // Определить категорию текущего пользователя
    let categoryName = '🌟 Новичок';
    let categoryEmoji = '✨';

    if (user.totalQuestsCompleted >= 45) {
      categoryName = '🥇 ЛЕГЕНДА';
      categoryEmoji = '👑';
    } else if (user.totalQuestsCompleted >= 30) {
      categoryName = '🥈 ЧЕМПИОН';
      categoryEmoji = '🏆';
    } else if (user.totalQuestsCompleted >= 15) {
      categoryName = '🥉 ЗВЕЗДА';
      categoryEmoji = '⭐';
    } else if (user.totalQuestsCompleted >= 5) {
      categoryName = '🌠 ВОСХОДЯЩАЯ';
      categoryEmoji = '💫';
    }

    // Определить сколько квестов до следующего уровня
    const thresholds = [5, 15, 30, 45];
    let nextThreshold = thresholds.find(t => t > user.totalQuestsCompleted) || Infinity;
    const questsNeeded = nextThreshold === Infinity ? 0 : nextThreshold - user.totalQuestsCompleted;

    // Формировать сообщение
    let message = `🏆 LEADERBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Показать топ категорий
    if (categories.legend.length > 0) {
      message += `🥇 ЛЕГЕНДА (1 герой)\n`;
      message += `   👑 ${categories.legend[0].completed} квестов\n`;
      message += `   🔥 Серия: ${categories.legend[0].streak} дней\n\n`;
    }

    if (categories.champion.length > 0) {
      message += `🥈 ЧЕМПИОН (${categories.champion.length > 10 ? '10+' : categories.champion.length})\n`;
      const top2 = categories.champion.slice(0, 2);
      top2.forEach(u => {
        message += `   🏆 ${u.completed} квестов | 🔥 ${u.streak} дней\n`;
      });
      message += `\n`;
    }

    if (categories.star.length > 0) {
      message += `🥉 ЗВЕЗДА (${categories.star.length > 20 ? '20+' : categories.star.length})\n`;
      const top2 = categories.star.slice(0, 2);
      top2.forEach(u => {
        message += `   ⭐ ${u.completed} квестов | 🔥 ${u.streak} дней\n`;
      });
      message += `\n`;
    }

    if (categories.rising.length > 0) {
      message += `🌠 ВОСХОДЯЩАЯ (${categories.rising.length > 30 ? '30+' : categories.rising.length})\n`;
      message += `   💫 Новички показывают класс!\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Показать достижение текущего пользователя
    message += `👤 ТВЕ ДОСТИЖЕНИЕ:\n`;
    message += `${categoryEmoji} ${categoryName}\n`;
    message += `✅ ${user.totalQuestsCompleted} квестов\n`;
    message += `🔥 Серия: ${user.streak || 0} дней\n\n`;

    message += `📊 ТОЙ РЕЙТИНГ:\n`;
    message += `📈 Top ${percentile}% лидеров\n`;

    // Показать прогресс
    if (questsNeeded > 0) {
      const pluralForm = questsNeeded === 1 ? 'квеста' : questsNeeded < 5 ? 'квестов' : 'квестов';
      message += `🎯 До следующего уровня: ${questsNeeded} ${pluralForm}\n`;
    }

    message += `\n💪 Продолжай! Ты легенда! 🚀`;

    await ctx.reply(message, getMainMenuKeyboard());
    logger.info(`✅ Лидерборд показан пользователю ${userId}`);

  } catch (error) {
    logger.error('❌ Ошибка при показе лидерборда:', error);
    await ctx.reply('❌ Ошибка загрузки лидерборда', getMainMenuKeyboard());
  }
}

// Обработчик для кнопки "🏆 Лидерборд" в меню
bot.action('menu_leaderboard', showLeaderboard);

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
    logger.info('⏳ Начинаю запуск бота...');
    
    // Запускаем планировщик ПЕРЕД bot.launch()
    logger.info('⏳ Запускаю планировщик напоминаний...');
    startReminderScheduler();
    logger.info('✅ Планировщик запущен!');
    
    // Получить информацию о боте
    const me = await bot.telegram.getMe();
    logger.info(`🔗 https://t.me/${me.username}`);
    logger.info('🚀 Бот запущен и готов к работе!');
    
    // bot.launch() НЕ возвращает управление - слушает события
    logger.info('⏳ Вызываю bot.launch()...');
    await bot.launch();
    
  } catch (error) {
    logger.error('❌ Ошибка запуска:', error);
    logger.error('❌ Stack:', error.stack);
    process.exit(1);
  }
};

logger.info('🔴 ГЛАВНОЕ: Вызываю startBot()');
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

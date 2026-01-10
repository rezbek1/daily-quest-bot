/**
 * 🔥 DATABASE - FIREBASE ОБЁРТКА
 * src/db.js
 * Все CRUD операции в одном месте
 */

const admin = require('firebase-admin');
const config = require('./config');
const logger = require('./logger');

// ==================== ИНИЦИАЛИЗАЦИЯ FIREBASE ====================

let db = null;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      privateKey: config.FIREBASE_PRIVATE_KEY,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
    }),
  });
  
  db = admin.firestore();
  logger.info('✅ Firebase инициализирован');
} catch (error) {
  logger.error('❌ Ошибка Firebase:', error);
  process.exit(1);
}

// ==================== ФУНКЦИИ БАЗЫ ДАННЫХ ====================

/**
 * USERS
 */

async function getUser(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    logger.error(`❌ Ошибка получения пользователя ${userId}:`, error);
    return null;
  }
}

async function createOrUpdateUser(userId, userData) {
  try {
    const userRef = db.collection('users').doc(userId.toString());
    const currentUser = await userRef.get();
    
    if (!currentUser.exists) {
      // Создать нового пользователя
      await userRef.set({
        userId: userId.toString(),
        name: userData.first_name || 'Аноним',
        username: userData.username || `user_${userId}`,
        level: 1,
        xp: 0,
        totalQuestsCompleted: 0,
        badges: [],
        theme: 'black',
        settings: { 
          reminderTime: '19:00', 
          language: 'ru', 
          timezone: 'Europe/Moscow' 
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streak: 1,
        activityLog: [],
      });
      logger.info(`✅ Новый пользователь ${userId} создан`);
      return true;
    } else {
      // Обновить существующего пользователя
      await userRef.update({ lastActiveAt: new Date() });
      return false;
    }
  } catch (error) {
    logger.error(`❌ Ошибка создания пользователя ${userId}:`, error);
  }
}

async function updateUser(userId, data) {
  try {
    await db.collection('users').doc(userId.toString()).update(data);
  } catch (error) {
    logger.error(`❌ Ошибка обновления пользователя ${userId}:`, error);
  }
}

/**
 * QUESTS
 */

async function createQuest(userId, questData) {
  try {
    const questRef = db.collection('quests').doc();
    await questRef.set({
      userId: userId.toString(),
      ...questData,
      completed: false,
      createdAt: new Date(),
    });
    logger.info(`✅ Квест создан для пользователя ${userId}`);
    return questRef.id;
  } catch (error) {
    logger.error(`❌ Ошибка создания квеста для ${userId}:`, error);
  }
}

async function getActiveQuests(userId) {
  try {
    const snapshot = await db.collection('quests')
      .where('userId', '==', userId.toString())
      .where('completed', '==', false)
      .get();
    
    const quests = [];
    snapshot.forEach((doc) => {
      quests.push({ id: doc.id, ...doc.data() });
    });
    
    return quests;
  } catch (error) {
    logger.error(`❌ Ошибка получения квестов для ${userId}:`, error);
    return [];
  }
}

async function updateQuest(questId, data) {
  try {
    await db.collection('quests').doc(questId).update(data);
  } catch (error) {
    logger.error(`❌ Ошибка обновления квеста ${questId}:`, error);
  }
}

async function deleteQuest(questId) {
  try {
    await db.collection('quests').doc(questId).delete();
  } catch (error) {
    logger.error(`❌ Ошибка удаления квеста ${questId}:`, error);
  }
}

/**
 * ANALYTICS
 */

async function addAnalytics(userId, event, data) {
  try {
    await db.collection('analytics').add({
      userId: userId.toString(),
      event,
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error(`❌ Ошибка логирования события:`, error);
  }
}

/**
 * FEEDBACK
 */

async function addFeedback(userId, text) {
  try {
    await db.collection('feedback').add({
      userId: userId.toString(),
      text,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error(`❌ Ошибка добавления feedback:`, error);
  }
}

// ==================== ЭКСПОРТ ====================

// Добавляем функции к db объекту
db.getUser = getUser;
db.createOrUpdateUser = createOrUpdateUser;
db.updateUser = updateUser;
db.createQuest = createQuest;
db.getActiveQuests = getActiveQuests;
db.updateQuest = updateQuest;
db.deleteQuest = deleteQuest;
db.addAnalytics = addAnalytics;
db.addFeedback = addFeedback;

module.exports = {
  db,
  
  // Users
  getUser,
  createOrUpdateUser,
  updateUser,
  
  // Quests
  createQuest,
  getActiveQuests,
  updateQuest,
  deleteQuest,
  
  // Analytics
  addAnalytics,
  
  // Feedback
  addFeedback,
};

/**
 * 👤 USERS/CREATOR - src/modules/users/creator.js
 * Создание и обновление пользователей
 */

const logger = require('../../logger');
const { db } = require('../../db');

/**
 * Создать или обновить пользователя
 */
async function createOrUpdateUser(userId, userData) {
  try {
    const userRef = db.db.collection('users').doc(userId.toString());
    const currentUser = await userRef.get();

    if (!currentUser.exists) {
      // Создать новый пользователь
      await userRef.set({
        userId: userId.toString(),
        name: userData.first_name || 'Аноним',
        username: userData.username || `user_${userId}`,
        level: 1,
        xp: 0,
        totalQuestsCompleted: 0,
        badges: ['Первый день'],
        theme: 'black',
        settings: { 
          reminderTime: '19:00', 
          language: 'ru', 
          weeklyReportDay: 'sunday', 
          timezone: 'Europe/Moscow' 
        },
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
      logger.info(`✅ Новый пользователь создан: ${userId}`);
      return true;
    } else {
      // Обновить lastActiveAt
      await userRef.update({ lastActiveAt: new Date() });
      return false;
    }
  } catch (error) {
    logger.error('❌ Ошибка создания пользователя:', error);
    return null;
  }
}

module.exports = {
  createOrUpdateUser,
};

/**
 * 👤 USERS/MIGRATOR - src/modules/users/migrator.js
 * Миграция данных пользователя между версиями
 */

const logger = require('../../logger');
const { db } = require('../../db');

/**
 * Мигрировать данные пользователя
 * Добавляет недостающие поля автоматически
 */
async function migrateUserData(userId) {
  try {
    const user = await db.getUser(userId);
    if (!user) return;
    
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

    // Проверить settings
    if (!user.settings) {
      updates.settings = { 
        reminderTime: '19:00', 
        language: 'ru', 
        timezone: 'Europe/Moscow'
      };
      logger.info(`⚙️ Добавлены настройки для ${userId}`);
    }

    // Проверить theme
    if (!user.theme) {
      updates.theme = 'black';
      logger.info(`🎨 Установлена тема для ${userId}`);
    }

    // Если есть обновления - применить их
    if (Object.keys(updates).length > 0) {
      await db.updateUser(userId, updates);
      logger.info(`✅ Миграция завершена для ${userId}`, updates);
    }
  } catch (error) {
    logger.error('❌ Ошибка миграции данных:', error);
  }
}

module.exports = {
  migrateUserData,
};

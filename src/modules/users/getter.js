/**
 * 👤 USERS/GETTER - src/modules/users/getter.js
 * Получение пользователя с миграцией данных
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { migrateUserData } = require('./migrator');

/**
 * Получить пользователя с автоматической миграцией
 */
async function getUser(userId) {
  try {
    // Сначала мигрировать данные если нужно
    await migrateUserData(userId);
    
    // Потом получить пользователя
    return await db.getUser(userId);
  } catch (error) {
    logger.error('❌ Ошибка получения пользователя:', error);
    return null;
  }
}

module.exports = {
  getUser,
};

/**
 * 👤 USERS/CREATOR - src/modules/users/creator.js
 * Создание и обновление пользователей
 */

const logger = require('../../logger');
const dbModule = require('../../db');

/**
 * Создать или обновить пользователя
 */
async function createOrUpdateUser(userId, userData) {
  try {
    // Используем функцию из db.js
    const result = await dbModule.createOrUpdateUser(userId, {
      first_name: userData.first_name || 'Аноним',
      username: userData.username || `user_${userId}`,
    });
    
    if (result) {
      logger.info(`✅ Новый пользователь создан: ${userId}`);
    } else {
      logger.info(`✅ Пользователь обновлен: ${userId}`);
    }
    
    return result;
  } catch (error) {
    logger.error('❌ Ошибка создания пользователя:', error);
    return null;
  }
}

/**
 * Получить пользователя
 */
async function getUser(userId) {
  try {
    return await dbModule.getUser(userId);
  } catch (error) {
    logger.error(`❌ Ошибка получения пользователя ${userId}:`, error);
    return null;
  }
}

/**
 * Обновить пользователя
 */
async function updateUser(userId, data) {
  try {
    await dbModule.updateUser(userId, data);
    return true;
  } catch (error) {
    logger.error(`❌ Ошибка обновления пользователя ${userId}:`, error);
    return false;
  }
}

module.exports = {
  createOrUpdateUser,
  getUser,
  updateUser,
};

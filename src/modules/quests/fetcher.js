/**
 * 📦 QUESTS FETCHER - quests/fetcher.js
 * Получение квестов пользователя
 */

const logger = require('../../logger');
const { db } = require('../../db');

/**
 * Получить активные квесты пользователя
 */
async function getActiveQuests(userId) {
  try {
    const snapshot = await db.collection('quests')
      .where('userId', '==', userId.toString())
      .get();
    
    const quests = [];
    snapshot.forEach((doc) => {
      const quest = doc.data();
      if (!quest.completed) {
        quests.push({ id: doc.id, ...quest });
      }
    });
    
    quests.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    return quests;
  } catch (error) {
    logger.error('❌ Ошибка получения квестов:', error);
    return [];
  }
}

/**
 * Получить квесты на сегодня
 */
async function getTodayQuests(userId) {
  try {
    const allQuests = await getActiveQuests(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allQuests.filter(quest => {
      const createdDate = quest.createdAt.toDate();
      return createdDate >= today && createdDate < tomorrow;
    });
  } catch (error) {
    logger.error('❌ Ошибка получения квестов на сегодня:', error);
    return [];
  }
}

module.exports = {
  getActiveQuests,
  getTodayQuests,
};

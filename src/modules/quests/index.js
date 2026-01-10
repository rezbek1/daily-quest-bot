/**
 * 📦 QUESTS MODULE - quests/index.js
 * Управление квестами - главный файл
 */

const creator = require('./creator');
const completer = require('./completer');
const fetcher = require('./fetcher');

/**
 * Регистрация модуля квестов
 */
function register(bot) {
  console.log('📦 Регистрирую Quests модуль...');
  // Не требует регистрации обработчиков - используется другими модулями
}

module.exports = {
  register,
  createQuest: creator.createQuest,
  generateQuestStory: creator.generateQuestStory,
  completeQuest: completer.completeQuest,
  updateStreak: completer.updateStreak,
  getActiveQuests: fetcher.getActiveQuests,
  getTodayQuests: fetcher.getTodayQuests,
};

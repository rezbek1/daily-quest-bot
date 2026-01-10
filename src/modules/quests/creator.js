/**
 * 📦 QUESTS CREATOR - quests/creator.js
 * Создание квестов и генерация историй
 */

const axios = require('axios');
const logger = require('../../logger');
const config = require('../../config');
const { db } = require('../../db');
const prompts = require('./prompts');

/**
 * Создать квест
 */
async function createQuest(userId, taskDescription) {
  try {
    const user = await db.getUser(userId);
    if (!user) {
      logger.warn(`⚠️ Пользователь ${userId} не найден при создании квеста`);
      return null;
    }

    // Получить текущую тему пользователя
    const theme = user.theme || 'black';

    // Генерировать историю квеста
    logger.info(`📝 Генерирую историю квеста для ${userId}...`);
    const story = await generateQuestStory(taskDescription, theme);

    // Рассчитать XP в зависимости от длины описания
    const xp = Math.min(10 + Math.floor(taskDescription.length / 10), 50);

    // Создать квест в БД
    const questData = {
      userId: userId.toString(),
      questNumber: user.totalQuestsCompleted + 1,
      title: taskDescription,
      story: story,
      xp: xp,
      theme: theme,
      completed: false,
      createdAt: new Date(),
      completedAt: null,
    };

    const questRef = db.collection('quests').doc();
    await questRef.set(questData);

    logger.info(`✅ Квест #${questData.questNumber} создан: "${taskDescription}"`);

    return {
      id: questRef.id,
      questNumber: questData.questNumber,
      title: questData.title,
      story: questData.story,
      xp: questData.xp,
    };
  } catch (error) {
    logger.error('❌ Ошибка создания квеста:', error);
    return null;
  }
}

/**
 * Генерировать историю квеста через ChatGPT
 */
async function generateQuestStory(taskDescription, theme = 'black') {
  try {
    const promptTemplate = prompts.PROMPTS[theme] || prompts.PROMPTS.black;
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
          Authorization: `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    logger.error('❌ Ошибка ChatGPT:', error.message);
    return 'Облагородь эту задачу так, чтобы выглядело честным.';
  }
}

module.exports = {
  createQuest,
  generateQuestStory,
};

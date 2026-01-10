/**
 * 📦 QUESTS/COMPLETER - src/modules/quests/completer.js
 * Завершение квестов и обновление прогресса
 */

const logger = require('../../logger');
const { db } = require('../../db');

/**
 * Завершить квест
 */
async function completeQuest(userId, questId) {
  try {
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      return { success: false, error: 'Квест не найден' };
    }

    const quest = questDoc.data();
    if (quest.userId !== userId.toString()) {
      return { success: false, error: 'Это не твой квест!' };
    }
    if (quest.completed) {
      return { success: false, error: 'Этот квест уже выполнен' };
    }

    // Отметить квест как выполненный
    await questRef.update({ completed: true, completedAt: new Date() });

    // Получить пользователя
    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    const user = userDoc.data();

    // Обновить XP и уровень
    const newXp = user.xp + quest.xp;
    const newLevel = Math.floor(newXp / 300) + 1;
    
    // Обновить streak
    const newStreak = await updateStreak(userId);
    
    // Обновить activityLog
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

    // Сохранить обновления пользователя
    await userRef.update({
      xp: newXp, 
      level: newLevel, 
      totalQuestsCompleted: user.totalQuestsCompleted + 1,
      streak: newStreak,
      lastActiveAt: new Date(),
      activityLog: activityLog
    });

    // Логировать в analytics
    await db.addAnalytics(userId, 'quest_completed', {
      questId,
      xpGained: quest.xp,
      newLevel,
      timestamp: new Date(),
    });

    logger.info(`✅ Квест #${quest.questNumber} выполнен: ${questId}, XP: +${quest.xp}, Streak: ${newStreak}`);
    
    return {
      success: true, 
      xpGained: quest.xp, 
      newXp, 
      newLevel, 
      newStreak,
      questNumber: quest.questNumber, 
      questTitle: quest.title,
    };
  } catch (error) {
    logger.error('❌ Ошибка завершения квеста:', error);
    return { success: false, error: 'Ошибка сохранения' };
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
    
    if (!user) return 1;
    
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
    
    return newStreak;
  } catch (error) {
    logger.error('❌ Ошибка обновления streak:', error);
    return 1;
  }
}

module.exports = {
  completeQuest,
  updateStreak,
};

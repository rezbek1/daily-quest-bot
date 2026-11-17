/**
 * 📊 ЭКСПОРТ ДАННЫХ ИЗ FIREBASE
 * Запуск: node scripts/export-data.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Инициализация Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  console.log(`📥 Экспорт коллекции: ${collectionName}...`);

  const snapshot = await db.collection(collectionName).get();
  const data = [];

  snapshot.forEach(doc => {
    data.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`   Найдено ${data.length} документов`);
  return data;
}

async function main() {
  try {
    console.log('🚀 Начинаю экспорт данных из Firebase...\n');

    // Экспортируем все коллекции
    const quests = await exportCollection('quests');
    const users = await exportCollection('users');
    const feedback = await exportCollection('feedback');
    const analytics = await exportCollection('analytics');

    // Создаём папку для экспорта
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Timestamp для имени файла
    const timestamp = new Date().toISOString().slice(0, 10);

    // Сохраняем в JSON
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: {
        quests: quests.length,
        users: users.length,
        feedback: feedback.length,
        analytics: analytics.length,
      },
      quests,
      users,
      feedback,
      analytics,
    };

    const filename = `export-${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log('\n✅ Экспорт завершён!');
    console.log(`📁 Файл: exports/${filename}`);
    console.log('\n📊 Статистика:');
    console.log(`   Квестов: ${quests.length}`);
    console.log(`   Пользователей: ${users.length}`);
    console.log(`   Отзывов: ${feedback.length}`);
    console.log(`   Аналитика: ${analytics.length}`);

    // Показать примеры квестов
    if (quests.length > 0) {
      console.log('\n📝 Примеры квестов (последние 3):');
      const recent = quests
        .sort((a, b) => new Date(b.createdAt?._seconds * 1000 || 0) - new Date(a.createdAt?._seconds * 1000 || 0))
        .slice(0, 3);

      recent.forEach((q, i) => {
        console.log(`\n--- Квест ${i + 1} ---`);
        console.log(`Задача: ${q.originalTask || q.title || 'N/A'}`);
        console.log(`История: ${(q.story || '').slice(0, 200)}...`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();

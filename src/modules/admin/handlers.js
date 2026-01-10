/**
 * 🔐 ADMIN HANDLERS - src/modules/admin/handlers.js
 * Broadcast, статистика, обработчики
 */

const logger = require('../../logger');
const { db } = require('../../db');
const { getAdminKeyboard } = require('./keyboards');
const config = require('../../config');

/**
 * Регистрация обработчиков администратора
 */
function register(bot) {
  // Broadcast обработчики
  bot.action('admin_broadcast_text', handleBroadcastText);
  bot.action('admin_broadcast_photo', handleBroadcastPhoto);
  bot.action('admin_broadcast_video', handleBroadcastVideo);
  
  // Статистика
  bot.action('admin_stats', handleStats);
  
  // Список админов
  bot.action('admin_list_show', handleListAdmins);
  
  // Меню
  bot.action('admin_menu', handleAdminMenuRefresh);
  
  // Выход
  bot.action('admin_logout_confirm', handleLogoutConfirm);
  bot.action('admin_logout_yes', handleLogoutYes);
}

/**
 * 📣 Broadcast текст
 */
async function handleBroadcastText(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.waitingForBroadcastText = true;
  await ctx.reply('📝 Отправь текст для рассылки всем пользователям:');
  await ctx.answerCbQuery();
}

/**
 * 📸 Broadcast фото
 */
async function handleBroadcastPhoto(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.waitingForBroadcastPhoto = true;
  await ctx.reply('📸 Отправь фото для рассылки всем пользователям:');
  await ctx.answerCbQuery();
}

/**
 * 🎥 Broadcast видео
 */
async function handleBroadcastVideo(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.waitingForBroadcastVideo = true;
  await ctx.reply('🎥 Отправь видео для рассылки всем пользователям:');
  await ctx.answerCbQuery();
}

/**
 * 📊 Статистика
 */
async function handleStats(ctx) {
  try {
    const usersSnapshot = await db.collection('users').get();
    const questsSnapshot = await db.collection('quests').get();
    
    let totalQuestsCompleted = 0;
    questsSnapshot.forEach(doc => {
      if (doc.data().completed) {
        totalQuestsCompleted++;
      }
    });

    const statsMessage = `📊 СТАТИСТИКА БОТА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Пользователей: ${usersSnapshot.size}
📦 Всего квестов: ${questsSnapshot.size}
✅ Выполнено квестов: ${totalQuestsCompleted}

📈 Активность: ${Math.round((totalQuestsCompleted / questsSnapshot.size) * 100)}%`;

    await ctx.reply(statsMessage, getAdminKeyboard());
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('❌ Ошибка при получении статистики:', error);
    await ctx.answerCbQuery('❌ Ошибка', true);
  }
}

/**
 * 👥 Список администраторов
 */
async function handleListAdmins(ctx) {
  const message = `👥 АДМИНИСТРАТОРЫ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Только авторизованные пользователи вижу в этой сессии.

Всего админов в боте: Неограниченно (по паролю)`;

  await ctx.reply(message, getAdminKeyboard());
  await ctx.answerCbQuery();
}

/**
 * 🔄 Обновить меню админа
 */
async function handleAdminMenuRefresh(ctx) {
  await ctx.editMessageText('🔐 АДМИН-ПАНЕЛЬ', getAdminKeyboard());
  await ctx.answerCbQuery();
}

/**
 * 🚪 Подтверждение выхода
 */
async function handleLogoutConfirm(ctx) {
  const { Markup } = require('telegraf');
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Да, выйти', 'admin_logout_yes'),
      Markup.button.callback('❌ Отмена', 'admin_menu'),
    ],
  ]);
  
  await ctx.reply('⚠️ Вы уверены, что хотите выйти?', keyboard);
  await ctx.answerCbQuery();
}

/**
 * 🚪 Выход подтвержден
 */
async function handleLogoutYes(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.isAdmin = false;
  
  const { getMainMenuKeyboard } = require('../keyboard');
  await ctx.reply('👋 Вы вышли из админ-панели', getMainMenuKeyboard());
  await ctx.answerCbQuery('✅ Выход выполнен', true);
}

module.exports = {
  register,
};


/**
 * ⌨️ ADMIN KEYBOARDS
 * Клавиатуры для админ панели
 */

const { Markup } = require('telegraf');

/**
 * Главное меню администратора
 */
function getAdminKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📣 Broadcast Text', 'admin_broadcast_text'),
      Markup.button.callback('📸 Broadcast Photo', 'admin_broadcast_photo'),
    ],
    [
      Markup.button.callback('🎥 Broadcast Video', 'admin_broadcast_video'),
      Markup.button.callback('📊 Статистика', 'admin_stats'),
    ],
    [
      Markup.button.callback('👥 Список админов', 'admin_list_show'),
      Markup.button.callback('🔄 Обновить', 'admin_menu'),
    ],
    [
      Markup.button.callback('🚪 Выход из админки', 'admin_logout_confirm'),
    ],
  ]);
}

/**
 * Кнопка назад
 */
function getBackToAdminKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('« Назад в меню', 'admin_menu'),
      Markup.button.callback('🚪 Выход', 'admin_logout_confirm'),
    ],
  ]);
}

module.exports = {
  getAdminKeyboard,
  getBackToAdminKeyboard,
};

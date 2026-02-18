/**
 * ⌨️ ADMIN KEYBOARDS
 * Клавиатуры для админ панели
 */

const { Markup } = require('telegraf');

/**
 * Главное меню администратора
 */
function getAdminKeyboard(isSuperAdmin = false) {
  const buttons = [
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
    ],
  ];

  // Только супер-админ видит кнопки управления админами
  if (isSuperAdmin) {
    buttons.push([
      Markup.button.callback('➕ Добавить админа', 'admin_add_start'),
      Markup.button.callback('➖ Удалить админа', 'admin_remove_start'),
    ]);
  }

  buttons.push([
    Markup.button.callback('🚪 Выход из админки', 'admin_logout_confirm'),
  ]);

  return Markup.inlineKeyboard(buttons);
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

/**
 * 🎨 FORMAT UTILS - src/utils/format.js
 * HTML-форматирование сообщений бота
 */

/**
 * Экранировать спецсимволы HTML
 */
function esc(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Прогресс-бар из блоков
 * @param {number} current - текущее значение
 * @param {number} max - максимум
 * @param {number} steps - количество блоков (по умолчанию 10)
 */
function progressBar(current, max, steps = 10) {
  const filled = Math.round((current / max) * steps);
  const empty = steps - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

/**
 * Название уровня с тёмным юмором
 */
function levelTitle(level) {
  const titles = {
    1: 'Выживший новобранец',
    2: 'Хронический трудоголик',
    3: 'Мастер прокрастинации',
    4: 'Сертифицированный страдалец',
    5: 'Ветеран корпоративных войн',
    6: 'Легенда дедлайнов',
    7: 'Тёмный властелин задач',
    8: 'Архидемон продуктивности',
    9: 'Бессмертный предприниматель',
    10: 'Бог хаоса и KPI',
  };
  return titles[level] || titles[10];
}

module.exports = { esc, progressBar, levelTitle };

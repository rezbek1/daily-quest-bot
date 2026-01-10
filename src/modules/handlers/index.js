/**
 * 🎯 HANDLERS - handlers/index.js
 * Центральная регистрация всех обработчиков
 */

const actions = require('./actions');
const text = require('./text');
const callbacks = require('./callbacks');
const logger = require('../../logger');

/**
 * Регистрация всех обработчиков
 */
function register(bot) {
  logger.info('🎯 Регистрирую Handlers модуль...');
  
  try {
    actions.register(bot);
    logger.info('  ✅ Actions зарегистрированы');
    
    text.register(bot);
    logger.info('  ✅ Text handler зарегистрирован');
    
    callbacks.register(bot);
    logger.info('  ✅ Callbacks зарегистрированы');
    
    logger.info('✅ Handlers модуль полностью зарегистрирован');
  } catch (error) {
    logger.error('❌ Ошибка регистрации handlers:', error);
  }
}

module.exports = { register };

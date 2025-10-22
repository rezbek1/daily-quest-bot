# 🖤 ПОВСЕДНЕВНЫЙ КВЕСТ - Dockerfile
# Для развертывания в контейнере

FROM node:18-alpine

# Установить рабочую директорию
WORKDIR /app

# Скопировать package файлы
COPY package*.json ./

# Установить зависимости
RUN npm ci --only=production

# Скопировать исходный код
# COPY src/ ./src/

# Скопировать environment файл


# Переменные окружения по умолчанию
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Запустить бота
CMD ["npm", "start"]

# Labels для документации
LABEL version="1.0.0"
LABEL description="Daily Quest - Telegram bot with dark humor for business people"
LABEL maintainer="DailyQuest Team"

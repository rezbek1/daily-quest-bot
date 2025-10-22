# 🖤 ПОВСЕДНЕВНЫЙ КВЕСТ
## Telegram Bot для циничных бизнесменов

> **Твоя работа, только с честностью и черным юмором**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue)](https://telegram.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5--turbo-purple)](https://openai.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Требования](#требования)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Запуск](#запуск)
- [Развертывание](#развертывание)
- [Команды бота](#команды-бота)
- [Архитектура](#архитектура)
- [Trouble Shooting](#trouble-shooting)

---

## 🚀 Быстрый старт

### Локально (за 5 минут)

```bash
# 1. Клонировать/скачать проект
git clone https://github.com/yourusername/daily-quest-bot.git
cd daily-quest-bot

# 2. Установить зависимости
npm install

# 3. Скопировать и заполнить .env
cp .env.example .env
# Отредактировать .env с твоими ключами

# 4. Запустить
npm start
```

### С Docker (за 2 минуты)

```bash
# Убедиться, что Docker установлен
docker --version

# Скопировать .env
cp .env.example .env

# Запустить
docker-compose up -d

# Смотреть логи
docker-compose logs -f bot
```

---

## 📦 Требования

### Минимум:
- **Node.js** v18+
- **npm** v9+

### Аккаунты:
1. **Telegram @BotFather** - создать бота
2. **OpenAI API** - для ChatGPT (платная услуга)
3. **Firebase** - для базы данных (бесплатная прога)

### Опционально:
- **Docker** - для контейнеризации
- **Redis** - для async задач (напоминания)

---

## 🔧 Установка

### Шаг 1: Клонировать проект

```bash
git clone https://github.com/yourusername/daily-quest-bot.git
cd daily-quest-bot
```

### Шаг 2: Установить зависимости

```bash
npm install
```

Или с yarn:
```bash
yarn install
```

### Шаг 3: Получить API ключи

#### A. Telegram Bot Token

```
1. Открыть Telegram и найти @BotFather
2. Команда: /newbot
3. Следовать инструкциям
4. Получить: BOT_TOKEN (вид: 123456:ABC-DEF...)
5. Сохранить в .env → BOT_TOKEN=...
```

#### B. OpenAI API Key

```
1. Перейти на https://platform.openai.com/api/keys
2. Создать новый ключ
3. Скопировать: OPENAI_API_KEY (вид: sk-proj-...)
4. ВАЖНО: Сохранить (показывается только один раз!)
5. Добавить в .env → OPENAI_API_KEY=...
```

#### C. Firebase Setup

```
1. Перейти на https://firebase.google.com/
2. Создать новый проект: "everyday-quest"
3. Включить: Firestore Database
4. Включить: Authentication (опционально)
5. Перейти: Project Settings → Service Account
6. Нажать: Generate Private Key
7. Скачать JSON файл
8. Заполнить в .env:
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY (скопировать из JSON)
   - FIREBASE_CLIENT_EMAIL
```

---

## ⚙️ Конфигурация

### Создать .env файл

```bash
cp .env.example .env
```

### Отредактировать .env

```env
# Обязательные
BOT_TOKEN=твой_токен_от_@BotFather
OPENAI_API_KEY=sk-proj-твой_ключ
FIREBASE_PROJECT_ID=твой_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com

# Опционально
NODE_ENV=development
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
```

### Проверить конфигурацию

```bash
npm run test:config
```

---

## ▶️ Запуск

### Локально (Development)

```bash
# Обычный запуск
npm start

# С автоперезагрузкой (требует nodemon)
npm run dev

# С debug логами
LOG_LEVEL=debug npm start
```

### С Docker

```bash
# Запустить контейнер
docker-compose up -d

# Смотреть логи в реальном времени
docker-compose logs -f bot

# Остановить
docker-compose down
```

### Проверить, что бот работает

```bash
# В Telegram найти твоего бота
# Написать: /start

# Если ответил → все работает! 🎉
```

---

## 🌐 Развертывание

### Вариант 1: Railway.app (рекомендую)

```bash
# 1. Зарегистрироваться на railway.app
# 2. Подключить GitHub репо
# 3. Добавить Environment Variables (.env)
# 4. Deploy!

# Бесплатно: $5/месяц кредиты
```

### Вариант 2: Heroku (старый, но работает)

```bash
# 1. Установить Heroku CLI
brew install heroku/brew/heroku

# 2. Login
heroku login

# 3. Создать приложение
heroku create daily-quest-bot

# 4. Добавить переменные
heroku config:set BOT_TOKEN=xxx
heroku config:set OPENAI_API_KEY=xxx
# ... остальные

# 5. Deploy
git push heroku main
```

### Вариант 3: AWS Lambda + API Gateway

```bash
# Требует serverless framework
npm install -g serverless

# Конфигурация в serverless.yml
# Развертывание
serverless deploy
```

### Вариант 4: VPS (DigitalOcean, Linode)

```bash
# На своем сервере
1. SSH подключение
2. Установить Node.js
3. Клонировать репо
4. npm install
5. pm2 start src/bot.js

# Или с Docker
docker-compose up -d
```

---

## 💬 Команды бота

### Основные команды

| Команда | Описание | Пример |
|---------|---------|--------|
| `/start` | Регистрация | - |
| `/addtask [описание]` | Создать квест | `/addtask Согласовать контракт` |
| `/quests` | Список квестов | - |
| `/done [номер]` | Выполнить квест | `/done 1` |
| `/profile` | Профиль пользователя | - |
| `/stats` | Статистика | - |
| `/leaderboard` | Топ игроков | - |
| `/help` | Справка | - |
| `/feedback [текст]` | Отзыв | `/feedback Отличное приложение!` |

### Примеры использования

```
Пользователь: /start
Бот: 🖤 Добро пожаловать в "Повседневный квест"
     Твоя работа, только с честностью и юмором...

Пользователь: /addtask Согласовать бюджет
Бот: ⏳ Генерирую сюжет...
     ✅ Квест создан!
     📜 "Спуститься в подземелье финансов..."

Пользователь: /done 1
Бот: 🎉 КВЕСТ ВЫПОЛНЕН!
     ✨ +30 XP за выживание

Пользователь: /profile
Бот: 👤 ПРОФИЛЬ: Иван
     Уровень: 2 💀💀
     Квестов выполнено: 15
     ...
```

---

## 🏗️ Архитектура

### Структура проекта

```
daily-quest-bot/
├── src/
│   ├── bot.js                    # Главный файл
│   ├── handlers/                 # Обработчики команд (будущее)
│   │   ├── addtask.js
│   │   ├── profile.js
│   │   └── stats.js
│   ├── services/                 # Бизнес-логика (будущее)
│   │   ├── questService.js
│   │   ├── userService.js
│   │   └── xpService.js
│   ├── integrations/             # Внешние API (будущее)
│   │   ├── chatgpt.js
│   │   ├── firebase.js
│   │   └── slack.js
│   └── utils/                    # Утилиты
│       ├── prompts.js            # Промпты для ChatGPT
│       ├── constants.js
│       └── logger.js
│
├── .env.example                  # Пример переменных
├── .env                          # Реальные переменные (не в git)
├── package.json                  # Зависимости
├── Dockerfile                    # Docker конфиг
├── docker-compose.yml            # Docker Compose
├── README.md                     # Этот файл
└── .gitignore                    # Git ignore

### Stack

```
┌─────────────────────────────────────────┐
│      TELEGRAM USERS                     │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   TELEGRAM BOT      │
        │  (@daily_quest)     │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│ Node.js│   │ ChatGPT  │   │ Firebase │
│Express │   │ API      │   │Firestore │
└────────┘   └──────────┘   └──────────┘
    ▲
    │
┌───┴────────────┐
│  Telegraf.js   │
│  (Telegram SDK)│
└────────────────┘
```

---

## 🔍 Troubleshooting

### Проблема: "Cannot read property 'BOT_TOKEN'"

**Решение:**
```bash
# Проверить .env файл существует
cat .env

# Проверить BOT_TOKEN заполнен
grep BOT_TOKEN .env

# Должно быть: BOT_TOKEN=123456:ABC-DEF...
```

### Проблема: "401 Unauthorized from OpenAI"

**Решение:**
```bash
# Проверить OPENAI_API_KEY верный
grep OPENAI_API_KEY .env

# Проверить на openai.com, что ключ активен
# Ключ должен начинаться с: sk-proj-
```

### Проблема: "Firebase initialization failed"

**Решение:**
```bash
# Проверить FIREBASE_PRIVATE_KEY (может быть многострочный)
# В .env он должен быть с \n вместо переводов строк

# Пример правильного формата:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhk...\n-----END PRIVATE KEY-----\n"
```

### Проблема: Бот не отвечает на команды

**Решение:**
```bash
# 1. Проверить логи
npm start
# Должно быть: "🚀 Бот запущен и готов к работе!"

# 2. Проверить бота в Telegram
# Убедиться, что БОТ добавлен в чаты

# 3. Проверить BOT_TOKEN в @BotFather
# Может быть устаревшим или отключенным

# 4. Перезапустить бота
# Ctrl+C и заново npm start
```

### Проблема: Docker не запускается

**Решение:**
```bash
# Проверить Docker работает
docker ps

# Смотреть ошибки
docker-compose logs bot

# Пересчитать контейнер
docker-compose down
docker-compose up -d --build
```

---

## 📊 Мониторинг

### Логирование

Логи сохраняются в:
- `combined.log` - все события
- `error.log` - только ошибки

```bash
# Смотреть логи в реальном времени
tail -f combined.log

# Смотреть только ошибки
tail -f error.log
```

### Метрики (будущее)

- DAU (Daily Active Users)
- Success rate выполнения квестов
- Average XP per user per day
- ChatGPT API usage и costs

---

## 🤝 Вклад

Если нашел баг или у тебя есть идея:

1. Fork репо
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📝 License

MIT License - смотреть [LICENSE](LICENSE) для деталей

---

## 👥 Команда

- **Founder** - Разработчик, который тоже выгорел 🖤
- **Contributors** - Циничные люди, которые видят систему

---

## 💬 Контакты

- **GitHub Issues** - для багов и features
- **Email** - для серьезных вопросов
- **Telegram** - для экстренных случаев

---

## 🙏 Спасибо

Спасибо за использование "Повседневного квеста"!

Помни: это не приложение для мотивации.
Это приложение для *диагностики реальности с чувством юмора*.

**Живи честно. Работай эффективно. Ржи над абсурдом. 🖤**

---

**Последнее обновление:** Октябрь 2025  
**Версия:** 1.0.0  
**Статус:** Production Ready ✅

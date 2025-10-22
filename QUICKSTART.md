# 🚀 БЫСТРЫЙ СТАРТ

## За 5 минут локально

### 1. Скопируй .env
```bash
cp .env.example .env
```

### 2. Заполни .env ключами

Открой `.env` и вставь:

```env
BOT_TOKEN=твой_токен_от_BotFather
OPENAI_API_KEY=sk-proj-твой_ключ
FIREBASE_PROJECT_ID=твой_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
```

### 3. Установи зависимости

```bash
npm install
```

### 4. Запусти бота

```bash
npm start
```

Если все ОК, увидишь:
```
✅ Firebase инициализирован
🤖 Бот инициализирован
🚀 Бот запущен и готов к работе!
```

### 5. Тестируй в Telegram

Найди своего бота и напиши `/start`

---

## Где получить ключи?

1. **BOT_TOKEN** → @BotFather в Telegram
2. **OPENAI_API_KEY** → https://platform.openai.com/api/keys
3. **FIREBASE** → https://firebase.google.com/

📖 Подробнее см. README.md

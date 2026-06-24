# 🚀 Инструкция по запуску проекта Duel Reaction Trainer

Полное руководство по настройке и запуску приложения в **офлайн** (локальная разработка) и **онлайн** (продакшен) режимах.

---

## 📋 Требования

| Компонент | Офлайн (локально) | Онлайн (продакшен) |
|-----------|-------------------|-------------------|
| **Node.js** | v18+ | v18+ |
| **PostgreSQL** | v14+ (локально или Docker) | Neon (Serverless PostgreSQL) |
| **Redis** | v7+ (локально или Docker) | Upstash Redis (Serverless) |
| **HTTPS** | Не требуется (HTTP) | Обязательно |
| **Домен** | `localhost:3000` | Ваш домен (например, `yourdomain.com`) |

---

## 🟢 Режим 1: Офлайн (Локальная разработка)

Идеально подходит для разработки, тестирования и отладки. Всё работает на вашем компьютере.

### Шаг 1. Установка зависимостей

```bash
npm install
```

### Шаг 2. Настройка файла окружения

Скопируйте шаблон и заполните локальными значениями:

```bash
cp .env.example .env.local
```

**Минимальный набор переменных для `.env.local`:**

```env
# === БАЗА ДАННЫХ ===
DATABASE_URL="postgresql://postgres:password@localhost:5432/duel_reaction"

# === ПАРАМЕТРЫ ПУЛА (локально) ===
DB_POOL_MAX=5

# === АУТЕНТИФИКАЦИЯ ===
BETTER_AUTH_SECRET="change-me-to-a-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# === REDIS (для rate limiting) ===
REDIS_URL="redis://default:@localhost:6379"

# === РЕЖИМ ===
NODE_ENV="development"
```

> 💡 **Примечание:** `BETTER_AUTH_SECRET` должен быть строкой минимум 32 символа. Для генерации можно использовать: `openssl rand -base64 32`

### Шаг 3. Запуск баз данных через Docker

Откройте терминал и выполните:

```powershell
# PostgreSQL (порт 5432)
docker run -d --name duel-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=duel_reaction postgres:15

# Redis (порт 6379)
docker run -d --name duel-redis -p 6379:6379 redis:alpine
```

> ✅ База `duel_reaction` создаётся автоматически при первом подключении.

### Шаг 4. Инициализация базы данных

Примените схему таблиц из Drizzle ORM:

```bash
npm run db:push
```

Создадутся таблицы: `users`, `matches`, `rounds`, `match_participants`, `round_results`.

> Альтернативы: `npm run db:migrate` (для prod-ready) или `npm run db:studio` (GUI для просмотра данных).

### Шаг 5. (Опционально) Настройка OAuth

Для входа через GitHub/Google получите ключи и добавьте в `.env.local`:

| Переменная | GitHub | Google |
|-----------|--------|--------|
| `GITHUB_ID` / `GOOGLE_ID` | Client ID | Client ID |
| `GITHUB_SECRET` / `GOOGLE_SECRET` | Client Secret | Client Secret |

**Callback URL для регистрации:**
- GitHub: `http://localhost:3000/api/auth/callback/github`
- Google: `http://localhost:3000/api/auth/callback/google`

> ⚠️ Без OAuth-ключей кнопки входа не появятся. Email/Password вход работает всегда.

### Шаг 6. Запуск сервера разработки

```bash
npm run dev
```

Приложение откроется на `http://localhost:3000`.

### 🔍 Проверка работоспособности

В терминале `npm run dev` вы должны увидеть:
- ✅ `[REDIS] Connected successfully` — если Redis поднят
- ✅ `[PROTECTION] REDIS_URL not set, rate limiting disabled` — если Redis не поднят (приложение не упадёт)
- ✅ `✓ Ready in Xms` — сервер готов

---

## 🔵 Режим 2: Онлайн (Продакшен / Deployment)

Для публичного доступа через интернет. Использует serverless-инфраструктуру.

### Шаг 1. Подготовка инфраструктуры

| Компонент | Решение | Что делать |
|-----------|---------|-----------|
| **Хостинг** | Vercel / Railway | Создать проект, подключить репозиторий |
| **База данных** | Neon (Serverless PostgreSQL) | Создать проект, скопировать connection string |
| **Redis** | Upstash Redis | Создать базу, скопировать URL |
| **Домен + HTTPS** | Автоматически (Vercel) | Привязать домен в настройках хостинга |

### Шаг 2. Настройка переменных окружения

В панели хостинга (Vercel/Railway) установите переменные:

```env
# === БАЗА ДАННЫХ (Neon) ===
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.pg.neon.tech/duel_reaction?sslmode=require"

# === ПАРАМЕТРЫ ПУЛА (serverless) ===
# Не указывайте DB_POOL_MAX — код автоматически сбросит его в 1

# === АУТЕНТИФИКАЦИЯ ===
BETTER_AUTH_SECRET="<сгенерируйте на продакшене>"
BETTER_AUTH_URL="https://yourdomain.com"

# === REDIS (Upstash) ===
REDIS_URL="redis://default:password@xxx.upstash.io:6379"

# === РЕЖИМ ===
NODE_ENV="production"

# === OAuth (по желанию) ===
GITHUB_ID=...
GITHUB_SECRET=...
GOOGLE_ID=...
GOOGLE_SECRET=...
```

> 🔑 **Генерация BETTER_AUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

### Шаг 3. Настройка Better-auth для продакшена

**Критически важно:**
1. `BETTER_AUTH_URL` должен начинаться с `https://`
2. Домен должен быть привязан к хостингу
3. Cookie-сессии Better-auth **не работают без HTTPS**

**Callback URL для OAuth (в настройках GitHub/Google):**
- GitHub: `https://yourdomain.com/api/auth/callback/github`
- Google: `https://yourdomain.com/api/auth/callback/google`

### Шаг 4. Сборка и деплой

**Для Vercel:**
```bash
# Установка CLI (если нет)
npm i -g vercel

# Деплой
vercel --prod
```

**Для Railway:**
- Подключите репозиторий в панели Railway
- Добавьте переменные окружения
- Railway автоматически запустит деплой

### Шаг 5. Инициализация базы данных

После деплоя примените схему:

```bash
npm run db:push
# или
npm run db:migrate
```

### 🔍 Проверка работоспособности

- ✅ Приложение открывается по HTTPS
- ✅ Авторизация через GitHub/Google работает
- ✅ Redis подключён (rate limiting активен)
- ✅ `npm run build` проходит без ошибок

---

## 📊 Сравнение режимов

| Параметр | Офлайн (dev) | Онлайн (prod) |
|----------|-------------|---------------|
| **URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **PostgreSQL** | Локальный Docker (`localhost:5432`) | Neon (Serverless) |
| **Redis** | Локальный Docker (`localhost:6379`) | Upstash (Serverless) |
| **HTTPS** | ❌ Не нужен | ✅ Обязательно |
| **BETTER_AUTH_URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **Rate Limiting** | Redis (локальный) или fail-open | Upstash Redis (обязательно) |
| **DB Pool** | `DB_POOL_MAX=5` | Автоматически `1` (serverless) |
| **NODE_ENV** | `development` | `production` |
| **Запуск** | `npm run dev` | Vercel/Railway auto-deploy |

---

## 🛠 Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера (localhost:3000) |
| `npm run build` | Сборка продакшн-версии |
| `npm run start` | Запуск собранного приложения |
| `npm run db:push` | Применить схему в БД (dev) |
| `npm run db:migrate` | Применить миграции (prod) |
| `npm run db:studio` | Открыть GUI базы данных |
| `npm test` | Запуск Jest-тестов |
| `npm run test:watch` | Watch-режим тестов |
| `npm run lint` | ESLint проверка |

---

## 🐛 Решение частых проблем

### 1. `npm run build` падает с ошибкой типов
- Проверьте, что все импорты используют `@/*` алиасы
- Убедитесь, что `drizzle-kit` совместим с версией Drizzle ORM
- Запустите `npm run lint` для предварительной проверки

### 2. Better-auth не сохраняет сессию
- Убедитесь, что `BETTER_AUTH_URL` совпадает с реальным URL (http/https)
- Для продакшена **обязателен HTTPS**
- Проверьте, что куки не блокируются браузером

### 3. Redis не подключается
- В dev: проверьте, запущен ли `docker run duel-redis`
- В коде реализован `fail-open` — приложение не упадёт, rate limiting просто отключится
- В prod: проверьте `REDIS_URL` и доступность Upstash

### 4. `ECONNREFUSED` при подключении к PostgreSQL
- Проверьте, запущен ли `docker run duel-postgres`
- Убедитесь, что `DATABASE_URL` указывает на правильный хост/порт
- Проверьте, создана ли база `duel_reaction`

### 5. OAuth-вход не работает
- Убедитесь, что callback URL в настройках OAuth-провайдера точно совпадает с `BETTER_AUTH_URL/api/auth/callback/...`
- Проверьте, что `GITHUB_ID`/`GOOGLE_ID` и секреты заполнены корректно
- В dev используйте `http://`, в prod — `https://`

---

*Инструкция составлена на основе `KODA.md` и `howtolaunch.md`. Актуально для v1.0 проекта.*

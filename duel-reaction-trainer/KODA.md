# 📖 KODA.md — Контекст проекта

## 🎯 Обзор проекта
**Дуэльный тренажёр реакции** — многопользовательское веб-приложение для тренировки скорости реакции в реальном времени. Игроки (2–5 человек) соревнуются в ответе на визуальный сигнал, который появляется синхронно у всех участников. Побеждает игрок с наименьшим временем реакции в раунде и наибольшим количеством набранных баллов.

**Ключевые особенности:**
- Серверная фиксация времени реакции (клиент не измеряет время самостоятельно)
- Защита от манипуляций временем и фальстартов
- Поддержка серий из минимум 5 раундов
- История дуэлей и глобальная таблица лидеров
- Аутентификация и управление сессиями

**Технологический стек:**
| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 15 (App Router) |
| Язык | TypeScript (strict mode) |
| Бэкенд/API | tRPC 11 (type-safe RPC) |
| База данных | PostgreSQL 14+ + Drizzle ORM |
| Аутентификация | Better-auth (cookie-based) |
| Стили | Tailwind CSS 3 |
| Валидация | Zod |
| Состояние/Кэш | TanStack React Query 5 + SuperJSON |
| Тестирование | Jest 29 + React Testing Library |

## 🏗 Архитектура и структура
Проект следует стандартной структуре Next.js App Router с разделением на клиентскую и серверную части:

```
duel-reaction-trainer/
├── src/
│   ├── app/                      # Маршруты Next.js (страницы + API)
│   │   ├── api/auth/             # Better-auth endpoints
│   │   └── api/trpc/             # tRPC endpoints
│   ├── server/                   # Серверная логика (Node.js/Next.js API)
│   │   ├── api/                  # tRPC роутеры и конфигурация
│   │   ├── auth/                 # Better-auth настройка
│   │   └── db/                   # Схема БД и подключение
│   ├── lib/                      # Общие утилиты и провайдеры
│   └── components/               # Переиспользуемые UI-компоненты
├── src/__tests__/                # Тесты
├── drizzle.config.ts             # Конфигурация миграций
├── tailwind.config.ts            # Конфигурация стилей
└── package.json                  # Зависимости и скрипты
```

**Ключевые файлы:**
- `src/server/db/schema.ts` — полная схема БД (5 таблиц: `users`, `matches`, `rounds`, `match_participants`, `round_results`)
- `src/server/api/root.ts` — корневой роутер tRPC, собирает все API-маршруты
- `src/server/api/trpc.ts` — настройка контекста, middleware и защищённых процедур
- `src/lib/providers.tsx` — обёртка `TRPCProvider` с интеграцией React Query
- `src/app/layout.tsx` — корневой layout приложения

## 🚀 Сборка и запуск
**Требования:** Node.js 18+, PostgreSQL 14+, npm/yarn/pnpm

> **Offline-режим**: Проект полностью работает без интернета. Все зависимости устанавливаются заранее, PostgreSQL запускается локально (или через Docker).

**Базовые команды:**
```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполнить DATABASE_URL и BETTER_AUTH_SECRET

# Настройка базы данных
npm run db:push       # Применить схему напрямую (dev)
npm run db:migrate    # Применить миграции (prod-ready)
npm run db:studio     # Открыть GUI (Drizzle Studio)

# Запуск
npm run dev           # Режим разработки (localhost:3000)
npm run build         # Сборка под продакшен
npm run start         # Запуск собранного приложения

# Тестирование и линтинг
npm test              # Запуск Jest
npm run test:watch    # Watch-режим
npm run lint          # ESLint проверка
```

### Локальный запуск (offline / localhost)

```bash
# 1. Настройте .env.local
cat > .env.local << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/duel_reaction"
BETTER_AUTH_SECRET="local-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NODE_ENV="development"
EOF

# 2. Запустите PostgreSQL локально (пример с Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15

# 3. Создайте базу данных
docker exec -it <container_id> psql -U postgres -c "CREATE DATABASE duel_reaction;"

# 4. Накатите схему
npm run db:push

# 5. Запустите dev-сервер
npm run dev
```

### Ключевые отличия: Локально vs Продакшен

| Параметр | Локально (offline) | Продакшен |
|----------|-------------------|-----------|
| **PostgreSQL** | Локальный / Docker | Neon (Serverless) |
| **Redis** | Не нужен (Map в памяти) | Upstash Redis |
| **HTTPS** | Не нужен (HTTP) | Обязательно |
| **BETTER_AUTH_URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **Rate Limiting** | `Map` (в памяти) | Redis (распределённый) |
| **Хостинг** | `npm run dev` | Vercel / Railway |

## 📐 Правила разработки
1. **TypeScript Strict Mode**: Все файлы должны компилироваться без `any`. Используются пути `@/*` для алиасов импорта.
2. **Type-Safe API**: Все данные, передаваемые между клиентом и сервером, валидируются через **Zod** на стороне сервера и инференсируются на клиенте через tRPC.
3. **Сервер как источник правды**: Время реакции, статусы раундов и результаты вычисляются исключительно на сервере. Клиент передаёт только события нажатий.
4. **Семантика БД**: 
   - `matches` — серия раундов между игроками
   - `rounds` — отдельные раунды внутри матча
   - `match_participants` — привязка пользователей к матчам с учётом счёта и штрафов
   - `round_results` — фиксация времени реакции и фальстартов
5. **Структура кода**: Бизнес-логика изолирована в `src/server/`, UI-компоненты в `src/components/`, общие хуки/утилиты в `src/lib/`.
6. **Тестирование**: Критичная логика (расчёт времени, фальстарты, подсчёт очков) должна покрываться юнит- и интеграционными тестами.

## 🗺 Текущий статус разработки
| Фаза | Задача | Статус |
|------|--------|--------|
| 1 | Инфраструктура: Next.js, Drizzle, Better-auth, tRPC, структура, README | ✅ Завершено |
| ↳ Проверка сборки `npm run build` | ✅ Успешно |
| 2 | Серверная логика ядра: модели, механизмы генерации сигнала, логика фальстарта | ✅ Завершено |
| 3 | Защита от манипуляций: синхронизация, серверное время, race-conditions | ✅ Завершено |
| ↳ Redis для rate limiting | ✅ Успешно |
| 4 | tRPC-маршруты: создание раундов, отправка результатов | ⏳ Ожидает |
| 5 | Клиентский UI: лобби, раунд, результаты, история | ⏳ Ожидает |
| 6 | Тестирование: юнит- и интеграционные тесты ядра | ⏳ Ожидает |
| 7 | Боты-эмуляторы с настраиваемой реакцией | ⏳ Ожидает |
| 8 | Глобальная таблица лидеров | ⏳ Ожидает |
| 9 | Деплой и CI/CD: сервер, мониторинг, HTTPS | ⏳ Ожидает |

## 🚀 Стратегия деплоя

Деплой — **сквозной процесс**, а не отдельная фаза в конце:

| Этап | Что делать | Когда |
|------|-----------|-------|
| **Проверка сборки** | `npm run build` проходит без ошибок | После Фазы 1 ✅ |
| **Переделка rate limiting** | Заменить `Map` на Redis (для serverless) | После Фазы 3 ✅ |
| **CI/CD настройка** | GitHub Actions → автоматический деплой | После Фазы 6 |
| **Финальный деплой** | Домен, HTTPS, мониторинг, production БД | После Фазы 8 |

### Рекомендуемый стек для продакшена

| Компонент | Решение |
|-----------|---------|
| Фронтенд + Бэкенд | **Vercel** (Serverless) или **Railway** (Node.js) |
| База данных | **Neon** (Serverless PostgreSQL) |
| Кэш / Rate limiting | **Upstash Redis** |
| Домен + HTTPS | Автоматически через Vercel/Railway |
| Мониторинг | **Sentry** (ошибки) + **UptimeRobot** (аптайм) |

### Требования к продакшену

- **HTTPS** обязателен (Better-auth cookie-сессии не работают без HTTPS)
- **Redis** для rate limiting (вместо `Map` в памяти, который не работает на serverless)
- **Connection pooling** для PostgreSQL (PgBouncer или Neon's built-in pooling)
- **Environment variables** в настройках хостинга, не в коде

### Критические проблемы текущего кода для деплоя

1. **Rate Limiting в памяти** (`src/server/api/middleware/protection.ts`)
   - `Map` не работает на serverless (каждый запрос = новый процесс)
   - **Решение**: Переделать на Redis после Фазы 3

2. **Нет WebSocket/SSE для синхронизации**
   - Сейчас сигнал отправляется через tRPC (HTTP)
   - Для реального времени нужен SSE или WebSocket (см. Фазы 4-5)

3. **Better-auth требует настройки**
   - В `.env.production`: `BETTER_AUTH_URL="https://yourdomain.com"`
   - Обязательно HTTPS!

4. **БД-пул не оптимизирован для serverless**
   - `pg.Pool` в `src/server/db/index.ts` может создавать слишком много соединений
   - **Решение**: Использовать Neon's connection string с built-in pooling или PgBouncer

## ✅ Проверка сборки (Фаза 1)

Сборка проекта прошла успешно:

```
✓ Compiled successfully in 2.2s
Generating static pages (4/4)
```

**Маршруты:**
| Маршрут | Тип | Размер |
|---------|-----|--------|
| `/` | Static | 131 B |
| `/api/auth/[...better_auth]` | Dynamic | 131 B |
| `/api/trpc/[...trpc]` | Dynamic | 131 B |

**Исправленные ошибки при сборке:**
- Обновлена версия `drizzle-kit` до `^0.31.0` (совместимость с better-auth)
- Исправлены пути импорта в `src/app/api/trpc/[...trpc]/route.ts`
- Исправлен синтаксис в `src/server/services/match.ts` (удалён дублирующийся код)
- Исправлены типы Better-auth (удалён невалидный `session.cookie`)
- Исправлены типы tRPC (добавлен `transformer: superjson`)
- Добавлен `sql` для SQL-выражений в Drizzle ORM
- Добавлен `asc` в импорты drizzle-orm

## 🛡 После Фазы 3: Redis для rate limiting

### Что было сделано:

**Файл:** `src/server/api/middleware/protection.ts`

**Ключевые изменения:**
- Удалён `Map` в памяти (не работает на serverless)
- Добавлен `ioredis` для подключения к Redis
- Middleware теперь использует Redis для хранения таймеров
- TTL (Time To Live) = 300 секунд (автоматическая очистка)
- Fail-open: если Redis недоступен, проверка пропускается (не ломает приложение)

### Как работает:

```typescript
// Ключ: reaction:{participantId}:{roundId}
// Значение: timestamp последнего нажатия
// TTL: 300 секунд

await client.set(timerKey, Date.now().toString(), "EX", 300);
const lastReaction = await client.get(timerKey);
```

### Настройка для продакшена:

```env
# .env.production
REDIS_URL="redis://default:password@upstash.io:6379"
```

### Локальная разработка:

Если `REDIS_URL` не установлен — rate limiting отключается (для удобства тестирования).

## 🧠 Реализованная логика (Фаза 2)
**Файл:** `src/server/services/match.ts`

**Ключевые функции:**
- `createMatch`: Создание матча с 2-5 участниками и N раундами (транзакция).
- `joinMatch`: Присоединение игрока к ожидающему матчу (проверка слотов).
- `startRound`: Активация раунда и фиксация `signalTime` сервером.
- `submitReaction`: 
  - Фиксация времени реакции: `now - signalTime` (защита от манипуляций).
  - Обработка фальстарта: нажатие до `signalTime` → штраф -1 балл.
  - Транзакционная запись результатов.
- `checkRoundCompletion`: Автоматический финиш раунда, когда все ответили.
- `finishRound`: Определение победителя (мин. время) и начисление +1 балла.
- `getMatchDetails`: Получить полную картину матча (участники, раунды).

**Интеграция с tRPC:**
- Роутер `roundRouter` обновлен и вызывает методы `MatchService`.
- `submitReaction` теперь возвращает `roundFinished` и данные о завершении раунда.

## 🛡 Реализованная защита (Фаза 3)
**Файлы:**
- `src/server/utils/timing.ts` — Серверное время и утилиты защиты
- `src/server/api/middleware/protection.ts` — tRPC middleware для защиты от манипуляций
- `src/server/api/trpc.ts` — Интеграция middleware

**Ключевые механизмы защиты:**
1. **Серверное время**: `ServerTiming.now()` — единственный источник правды. Клиент не отправляет время.
2. **Blind Zone (Слепая зона)**: После фальстарта игрок получает задержку (500ms + 200ms за каждый фальстарт). В это время нажатие игнорируется.
3. **Транзакции с блокировкой**: `for('update')` — предотвращает race-conditions при одновременных нажатиях.
4. **Rate Limiting**: Middleware проверяет минимальный интервал между нажатиями (50ms).
5. **Защита от повторных ответов**: Проверка наличия результата в `roundResults`.

**Формула задержки:**
```
delay = min(500ms + (falseStarts * 200ms), 3000ms)
```

## 🔐 Безопасность и ограничения
- `Date.now()` на клиенте **не используется** для расчёта времени реакции.
- Все tRPC-процедуры, оперирующие данными пользователей, помечены как `protectedProcedure` (заглушка middleware реализована, ожидает полной интеграции с Better-auth).
- Секреты (`BETTER_AUTH_SECRET`, `DATABASE_URL`) хранятся в `.env` и не коммитятся в VCS.
- Для production рекомендуется настроить WebSocket/SSE для синхронной доставки сигнала и обработки нажатий с минимальной задержкой.

---
*Файл сгенерирован автоматически на основе анализа кодовой базы. Обновляется по мере перехода на новые фазы разработки.*

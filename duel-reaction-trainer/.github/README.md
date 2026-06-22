# CI/CD Pipeline

## Автоматизированный пайплайн (GitHub Actions)

### Структура
```
.github/workflows/
├── ci-cd.yml          # Основной пайплайн: lint → test → build → deploy
```

### Как работает

#### 1. Лоб-ветка (push/PR в develop/main)
- Устанавливаются зависимости (`npm ci`)
- Запускается линтинг (`npm run lint`)
- Запускаются тесты (`npm test`)
- Собирается проект (`npm run build`)

PostgreSQL и Redis поднимаются как GitHub Actions services для тестирования.

#### 2. Деплой (push в main)
- Если все проверки прошли → автоматический продакшен-деплой на Vercel
- Деплой только с ветки `main` через push

### Необходимые Secrets (настроить в GitHub → Settings → Secrets)

| Secret | Описание |
|--------|----------|
| `VERCEL_TOKEN` | Token из Vercel Account Settings |
| `VERCEL_ORG_ID` | ID организации в Vercel |
| `VERCEL_PROJECT_ID` | ID проекта в Vercel |

### Переменные окружения (настроить в Vercel Dashboard)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Connection string Neon PostgreSQL |
| `BETTER_AUTH_SECRET` | Случайная строка (min 32 символа) |
| `BETTER_AUTH_URL` | `https://yourdomain.com` |
| `REDIS_URL` | Connection string Upstash Redis |
| `NODE_ENV` | `production` |

## Rationale

### Почему GitHub Actions
- Нативная интеграция с GitHub (репозиторий проекта)
- Бесплатные минуты для публичных репозиториев
- Services (PostgreSQL, Redis) из коробки

### Почему Vercel
- Zero-config деплой для Next.js
- Автоматический HTTPS
- Preview deployments для pull requests
- Serverless-совместим (Redis через Upstash)

## Локальная проверка CI

Перед пушем проверьте локально:
```bash
# Линтинг
npm run lint

# Тесты (с локальным PostgreSQL + Redis)
npm test

# Сборка
npm run build
```

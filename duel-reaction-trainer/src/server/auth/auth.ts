import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

// ─── Проверка критических переменных окружения при старте ───
const requiredEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value || value.trim() === "") {
    throw new Error(`Отсутствует критическая переменная окружения: ${key}. Без неё приложение не может запуститься.`);
  }
}

// Гибкая настройка OAuth: включается только если заданы все необходимые ключи
const hasGoogle = !!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET);
const hasGithub = !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

// Если переменные пустые, логируем предупреждение, но не ломаем старт
// (Better-auth корректно отключит провайдер, если clientId пуст, но лучше знать об этом заранее)
if (!hasGoogle && process.env.ENABLE_GOOGLE_OAUTH !== "false") {
  console.warn("[Auth] GOOGLE_ID или GOOGLE_SECRET не заданы. Google OAuth будет недоступен.");
}
if (!hasGithub && process.env.ENABLE_GITHUB_OAUTH !== "false") {
  console.warn("[Auth] GITHUB_ID или GITHUB_SECRET не заданы. GitHub OAuth будет недоступен.");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  socialProviders: {
    google: hasGoogle
      ? {
          clientId: process.env.GOOGLE_ID!,
          clientSecret: process.env.GOOGLE_SECRET!,
        }
      : undefined,
    github: hasGithub
      ? {
          clientId: process.env.GITHUB_ID!,
          clientSecret: process.env.GITHUB_SECRET!,
        }
      : undefined,
  },
});

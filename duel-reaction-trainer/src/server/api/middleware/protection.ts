import Redis from "ioredis";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * tRPC Middleware для защиты от манипуляций
 * 
 * Использует Redis для rate limiting (работает на serverless)
 * 
 * Функции:
 * 1. Защита от повторных нажатий (rate limiting через Redis)
 * 2. Валидация входных данных
 * 3. Логирование подозрительных запросов
 */

// Конфигурация защиты
const PROTECTION_CONFIG = {
  MIN_INTERVAL_MS: 50, // Минимальный интервал между нажатиями
  MAX_REACTION_TIME_MS: 30000, // Максимальное время реакции (30 сек)
  MAX_PARTICIPANTS: 5,
  MIN_PARTICIPANTS: 2,
  TTL_SECONDS: 300, // Время жизни ключа в Redis (5 минут)
};

// Инициализация Redis клиента
let redisClient: Redis | null = null;

/**
 * Получение или создание Redis клиента
 */
async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    // Если Redis не настроен — пропускаем проверку (для локальной разработки)
    console.warn("[PROTECTION] REDIS_URL not set, rate limiting disabled");
    return null;
  }

  try {
    redisClient = new Redis(redisUrl);

    redisClient.on("error", (err) => {
      console.error("[REDIS] Connection error:", err);
    });

    // Проверяем подключение
    await redisClient.ping();
    console.log("[REDIS] Connected successfully");
    
    return redisClient;
  } catch (error) {
    console.error("[REDIS] Connection failed:", error);
    return null;
  }
}

/**
 * Middleware для проверки легитимности нажатия
 */
export const reactionProtectionMiddleware = async ({
  ctx,
  next,
  path,
  input,
}: {
  ctx: Record<string, unknown>;
  next: () => Promise<unknown>;
  path: string;
  input: unknown;
}) => {
  const start = Date.now();

  // Проверяем, является ли запрос процедурой реакции
  if (path.includes("submitReaction")) {
    const reactionInput = z.object({
      roundId: z.string(),
      participantId: z.string(),
    }).safeParse(input);

    if (!reactionInput.success) {
      console.warn("[PROTECTION] Invalid reaction input:", input);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Некорректные данные реакции",
      });
    }

    const { roundId, participantId } = reactionInput.data;
    const timerKey = `reaction:${participantId}:${roundId}`;

    try {
      const client = await getRedisClient();
      
      // Если Redis не подключён — пропускаем проверку
      if (!client) {
        return next();
      }

      // Проверяем, есть ли уже запись о нажатии
      const lastReaction = await client.get(timerKey);
      
      if (lastReaction) {
        const timeSinceLast = Date.now() - parseInt(lastReaction);
        if (timeSinceLast < PROTECTION_CONFIG.MIN_INTERVAL_MS) {
          console.warn(
            `[PROTECTION] Rate limit exceeded for ${participantId} in round ${roundId}`
          );
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Слишком быстрое нажатие",
          });
        }
      }

      // Записываем текущее время с TTL
      await client.set(timerKey, Date.now().toString(), "EX", PROTECTION_CONFIG.TTL_SECONDS);
      
    } catch (error) {
      // Если Redis недоступен — пропускаем проверку (fail-open)
      if (error instanceof TRPCError) throw error;
      console.warn("[PROTECTION] Redis check failed, allowing request:", error);
    }
  }

  // Вызываем следующую процедуру
  const result = await next();

  // Логирование длительности выполнения
  const duration = Date.now() - start;
  if (duration > 100) {
    console.warn(`[PROTECTION] Slow procedure ${path}: ${duration}ms`);
  }

  return result;
};

/**
 * Закрытие Redis подключения (для graceful shutdown)
 */
export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

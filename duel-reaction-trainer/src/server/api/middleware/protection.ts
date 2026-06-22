import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * tRPC Middleware для защиты от манипуляций
 * 
 * Функции:
 * 1. Защита от повторных нажатий (rate limiting)
 * 2. Валидация входных данных
 * 3. Логирование подозрительных запросов
 */

// Хранилище для отслеживания последних нажатий (в памяти, для dev)
// В продакшене использовать Redis или БД
const reactionTimers = new Map<string, number>();

// Конфигурация защиты
const PROTECTION_CONFIG = {
  MIN_INTERVAL_MS: 50, // Минимальный интервал между нажатиями
  MAX_REACTION_TIME_MS: 30000, // Максимальное время реакции (30 сек)
  MAX_PARTICIPANTS: 5,
  MIN_PARTICIPANTS: 2,
};

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
    const timerKey = `${participantId}-${roundId}`;

    // Проверяем, не слишком ли быстро отправлен запрос
    const lastReaction = reactionTimers.get(timerKey);
    if (lastReaction) {
      const timeSinceLast = Date.now() - lastReaction;
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

    // Обновляем таймер
    reactionTimers.set(timerKey, Date.now());
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
 * Middleware для очистки устаревших таймеров (запускать периодически)
 */
export const cleanupReactionTimers = () => {
  const now = Date.now();
  for (const [key, timestamp] of reactionTimers.entries()) {
    if (now - timestamp > 60000) { // 1 минута
      reactionTimers.delete(key);
    }
  }
};

// Настройка интервала очистки (каждые 60 секунд)
setInterval(cleanupReactionTimers, 60000);

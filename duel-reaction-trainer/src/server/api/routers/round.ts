import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "../../db";
import { matches, rounds, matchParticipants, roundResults, users } from "../../db/schema";
import { eq, asc, desc, count } from "drizzle-orm";

/**
 * Роутер для работы с дуэльными раундами
 */
export const roundRouter = router({
  // ========================================
  // ЗАГЛУШКИ — реализация будет на Фазах 2-4
  // ========================================

  /**
   * Получить информацию о доступных матчах
   */
  listMatches: publicProcedure.query(async () => {
    const matchList = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(20);

    return matchList;
  }),

  /**
   * Создать новый матч (серию раундов)
   * TODO: добавить проверку аутентификации
   */
  createMatch: publicProcedure
    .input(
      z.object({
        totalRounds: z.number().min(5).max(20).default(5),
        participantIds: z.array(z.string()).min(2).max(5),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      console.log("[ROUND] createMatch:", input);

      const newMatch = await db
        .insert(matches)
        .values({
          totalRounds: input.totalRounds,
          status: "waiting",
        })
        .returning();

      return newMatch[0];
    }),

  /**
   * Присоединиться к матчу
   */
  joinMatch: publicProcedure
    .input(
      z.object({
        matchId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      console.log("[ROUND] joinMatch:", input);

      return { success: true };
    }),

  /**
   * Начать раунд (сервер генерирует сигнал)
   */
  startRound: publicProcedure
    .input(
      z.object({
        roundId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      console.log("[ROUND] startRound:", input);

      return { signalSent: true };
    }),

  /**
   * Отправить результат реакции
   * Сервер фиксирует время и проверяет фальстарт
   */
  submitReaction: publicProcedure
    .input(
      z.object({
        roundId: z.string(),
        participantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      // TODO: Защита от подделки времени — сервер сам фиксирует Date.now()
      console.log("[ROUND] submitReaction:", input);

      return { reactionTime: 0, isFalseStart: false };
    }),

  /**
   * Получить результаты раунда
   */
  getRoundResult: publicProcedure
    .input(
      z.object({
        roundId: z.string(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      console.log("[ROUND] getRoundResult:", input);

      return { results: [] };
    }),

  /**
   * Получить историю дуэлей для пользователя
   */
  getMatchHistory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // TODO: Полная реализация на Фазах 2-4
      console.log("[ROUND] getMatchHistory:", input);

      return { matches: [], total: 0 };
    }),
});

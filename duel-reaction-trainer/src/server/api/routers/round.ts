import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { MatchService } from "../../services/match";
import { eq } from "drizzle-orm";
import { rounds, matches } from "../../db/schema";
import { db } from "../../db";

/**
 * Роутер для работы с дуэльными раундами
 */
export const roundRouter = router({
  /**
   * Получить список доступных матчей
   */
  listMatches: publicProcedure.query(async () => {
    const matchList = await db
      .select()
      .from(matches)
      .orderBy(matches.createdAt)
      .limit(20);

    return matchList;
  }),

  /**
   * Создать новый матч
   */
  createMatch: publicProcedure
    .input(
      z.object({
        totalRounds: z.number().min(5).max(20).default(5),
        participantIds: z.array(z.string()).min(2).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const match = await MatchService.createMatch(
        input.participantIds,
        input.totalRounds
      );
      return match;
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
      const match = await MatchService.joinMatch(
        input.matchId,
        input.userId
      );
      return match;
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
      const result = await MatchService.startRound(input.roundId);
      return result;
    }),

  /**
   * Отправить результат реакции
   */
  submitReaction: publicProcedure
    .input(
      z.object({
        roundId: z.string(),
        participantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await MatchService.submitReaction(
        input.roundId,
        input.participantId
      );
      
      // Проверяем, завершен ли раунд после этой реакции
      const completion = await MatchService.checkRoundCompletion(
        input.roundId
      );

      return {
        ...result,
        roundFinished: !!completion,
        roundCompletion: completion,
      };
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
      const round = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, input.roundId))
        .limit(1);

      if (!round[0]) return null;

      const { roundResults } = await import("../../db/schema");
      const results = await db
        .select()
        .from(roundResults)
        .where(eq(roundResults.roundId, input.roundId));

      return { round: round[0], results };
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
      const matches = await MatchService.getMatchHistory(
        input.userId,
        input.limit,
        input.offset
      );
      return { matches, total: matches.length };
    }),
});

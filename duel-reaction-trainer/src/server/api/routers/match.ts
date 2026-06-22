import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { MatchService } from "../../services/match";
import { desc, eq } from "drizzle-orm";
import { matches } from "../../db/schema";
import { db } from "../../db";

/**
 * Роутер для работы с матчами (сериями раундов)
 */
export const matchRouter = router({
  /**
   * Получить список всех матчей с пагинацией
   */
  listMatches: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(["waiting", "active", "finished"]).optional(),
      })
    )
    .query(async ({ input }) => {
      let matchList: any[];
      let total: any[];

      if (input.status) {
        matchList = await db
          .select()
          .from(matches)
          .where(eq(matches.status, input.status))
          .orderBy(desc(matches.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        total = await db
          .select({ count: matches.id })
          .from(matches)
          .where(eq(matches.status, input.status));
      } else {
        matchList = await db
          .select()
          .from(matches)
          .orderBy(desc(matches.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        total = await db.select({ count: matches.id }).from(matches);
      }

      return {
        matches: matchList,
        total: total.length,
      };
    }),

  /**
   * Получить детали матча с участниками и раундами
   */
  getMatchDetails: publicProcedure
    .input(
      z.object({
        matchId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const details = await MatchService.getMatchDetails(input.matchId);
      return details;
    }),

  /**
   * Получить историю матчей пользователя
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

  /**
   * Получить статистику по матчам
   */
  getMatchStats: publicProcedure.query(async () => {
    const allMatches = await db.select().from(matches);
    
    const stats = {
      total: allMatches.length,
      waiting: allMatches.filter((m) => m.status === "waiting").length,
      active: allMatches.filter((m) => m.status === "active").length,
      finished: allMatches.filter((m) => m.status === "finished").length,
    };

    return stats;
  }),
});

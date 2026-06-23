import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../../db";
import { users, matches, matchParticipants, roundResults, rounds } from "../../db/schema";
import { sql } from "drizzle-orm";

/**
 * Роутер для глобальной таблицы лидеров
 * Агрегирует статистику всех игроков по всем завершённым матчам
 */
export const leaderboardRouter = router({
  /**
   * Получить глобальную таблицу лидеров
   * Агрегация по userId:
   * - totalScore: сумма очков по всем матчам
   * - matchesPlayed: количество участвий в матчах
   * - wins: количество побед (лучшее время в раунде)
   * - avgReactionTime: среднее время реакции (только валидные раунды)
   * - totalFalseStarts: суммарное число фальстартов
   * - winRate: процент побед
   */
  getLeaderboard: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // Агрегация: объединяем match_participants с результатами раундов
      const rawStats = await db
        .select({
          participantId: matchParticipants.id,
          userId: matchParticipants.userId,
          userName: users.name,
          totalScore: sql<number>`COALESCE(SUM(${matchParticipants.score}), 0)`.mapWith(Number),
          matchesPlayed: sql<number>`COUNT(DISTINCT ${matchParticipants.matchId})`.mapWith(Number),
          totalFalseStarts: sql<number>`COALESCE(SUM(${matchParticipants.falseStarts}), 0)`.mapWith(Number),
          avgReactionTime: sql<number>`
            COALESCE(
              AVG(CASE 
                WHEN rr.reaction_time IS NOT NULL 
                AND rr.is_false_start = false 
                THEN rr.reaction_time 
                ELSE NULL 
              END), 
              null
            )
          `.mapWith((val: any) => (val !== null ? Number(val) : null)),
          totalRoundsPlayed: sql<number>`
            COUNT(CASE WHEN rr.id IS NOT NULL THEN 1 END)
          `.mapWith(Number),
          wins: sql<number>`
            COALESCE(SUM(
              CASE WHEN rr.participant_id = winner_wins.best_participant_id THEN 1 ELSE 0 END
            ), 0)
          `.mapWith(Number),
        })
        .from(matchParticipants)
        .leftJoin(users, sql`${matchParticipants.userId} = ${users.id}`)
        .leftJoin(roundResults, sql`${matchParticipants.id} = ${roundResults.participantId}`)
        .leftJoin(
          rounds,
          sql`${roundResults.roundId} = ${rounds.id}`
        )
        .leftJoin(
          matches,
          sql`${matchParticipants.matchId} = ${matches.id}`
        )
        .where(sql`${matches.status} = 'finished'`)
        .groupBy(
          matchParticipants.id,
          matchParticipants.userId,
          users.name
        )
        .orderBy(sql`totalScore DESC`)
        .limit(input.limit)
        .offset(input.offset);

      // Для подсчёта побед: нужно определить победителя каждого раунда
      // и посчитать, сколько раз каждый участник был победителем
      const roundWinners = await db
        .select({
          roundId: rounds.id,
          participantId: roundResults.participantId,
          reactionTime: roundResults.reactionTime,
        })
        .from(roundResults)
        .innerJoin(rounds, sql`${roundResults.roundId} = ${rounds.id}`)
        .innerJoin(
          matches,
          sql`${rounds.matchId} = ${matches.id}`
        )
        .where(
          sql`${matches.status} = 'finished' 
               AND ${roundResults.isFalseStart} = false 
               AND ${roundResults.reactionTime} IS NOT NULL`
        );

      // Группируем по roundId, находим победителя (минимальное время реакции)
      const winnerMap = new Map<string, { participantId: string; reactionTime: number }>();
      for (const row of roundWinners) {
        const existing = winnerMap.get(row.roundId);
        const reactionTime = row.reactionTime ?? Infinity;
        if (!existing || reactionTime < (existing.reactionTime ?? Infinity)) {
          winnerMap.set(row.roundId, {
            participantId: row.participantId,
            reactionTime,
          });
        }
      }

      // Пересчитываем wins для каждого участника
      const winsCount = new Map<string, number>();
      for (const [_, data] of winnerMap) {
        const participantId = data.participantId;
        winsCount.set(participantId, (winsCount.get(participantId) || 0) + 1);
      }

      // Финальная обработка
      const leaderboard = rawStats.map((stat, index) => {
        const totalWins = winsCount.get(stat.participantId) || 0;
        const totalRounds = stat.totalRoundsPlayed || 1;
        const winRate = totalRounds > 0 ? Math.round((totalWins / totalRounds) * 100) : 0;

        return {
          rank: input.offset + index + 1,
          participantId: stat.participantId,
          userId: stat.userId,
          name: stat.userName || `Игрок ${stat.userId.slice(0, 6)}`,
          totalScore: stat.totalScore,
          matchesPlayed: stat.matchesPlayed,
          totalFalseStarts: stat.totalFalseStarts,
          avgReactionTime: stat.avgReactionTime,
          totalRoundsPlayed: stat.totalRoundsPlayed,
          wins: totalWins,
          winRate,
        };
      });

      // Общее количество уникальных участников
      const totalResult = await db
        .select({ count: sql`COUNT(DISTINCT ${matchParticipants.userId})` })
        .from(matchParticipants)
        .leftJoin(
          matches,
          sql`${matchParticipants.matchId} = ${matches.id}`
        )
        .where(sql`${matches.status} = 'finished'`);

      return {
        leaderboard,
        total: totalResult[0].count as number,
      };
    }),

  /**
   * Получить позицию конкретного игрока в таблице лидеров
   */
  getPlayerRank: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const rawStats = await db
        .select({
          participantId: matchParticipants.id,
          userId: matchParticipants.userId,
          userName: users.name,
          totalScore: sql<number>`COALESCE(SUM(${matchParticipants.score}), 0)`.mapWith(Number),
          matchesPlayed: sql<number>`COUNT(DISTINCT ${matchParticipants.matchId})`.mapWith(Number),
          totalFalseStarts: sql<number>`COALESCE(SUM(${matchParticipants.falseStarts}), 0)`.mapWith(Number),
          avgReactionTime: sql<number>`
            COALESCE(
              AVG(CASE 
                WHEN rr.reaction_time IS NOT NULL 
                AND rr.is_false_start = false 
                THEN rr.reaction_time 
                ELSE NULL 
              END), 
              null
            )
          `.mapWith((val: any) => (val !== null ? Number(val) : null)),
          totalRoundsPlayed: sql<number>`
            COUNT(CASE WHEN rr.id IS NOT NULL THEN 1 END)
          `.mapWith(Number),
        })
        .from(matchParticipants)
        .leftJoin(users, sql`${matchParticipants.userId} = ${users.id}`)
        .leftJoin(roundResults, sql`${matchParticipants.id} = ${roundResults.participantId}`)
        .leftJoin(
          rounds,
          sql`${roundResults.roundId} = ${rounds.id}`
        )
        .leftJoin(
          matches,
          sql`${matchParticipants.matchId} = ${matches.id}`
        )
        .where(sql`${matches.status} = 'finished' AND ${matchParticipants.userId} = ${input.userId}`)
        .groupBy(
          matchParticipants.id,
          matchParticipants.userId,
          users.name
        );

      if (rawStats.length === 0) {
        return {
          found: false,
          message: "Игрок не найден в завершённых матчах",
        };
      }

      const stat = rawStats[0];

      // Подсчёт побед
      const roundWinners = await db
        .select({
          roundId: rounds.id,
          participantId: roundResults.participantId,
          reactionTime: roundResults.reactionTime,
        })
        .from(roundResults)
        .innerJoin(rounds, sql`${roundResults.roundId} = ${rounds.id}`)
        .innerJoin(
          matches,
          sql`${rounds.matchId} = ${matches.id}`
        )
        .where(
          sql`${matches.status} = 'finished' 
               AND ${roundResults.isFalseStart} = false 
               AND ${roundResults.reactionTime} IS NOT NULL
               AND ${matchParticipants.userId} = ${input.userId}`
        );

      const winnerMap = new Map<string, { participantId: string; reactionTime: number }>();
      for (const row of roundWinners) {
        const existing = winnerMap.get(row.roundId);
        const reactionTime = row.reactionTime ?? Infinity;
        if (!existing || reactionTime < (existing.reactionTime ?? Infinity)) {
          winnerMap.set(row.roundId, {
            participantId: row.participantId,
            reactionTime,
          });
        }
      }

      const winsCount = new Map<string, number>();
      for (const [_, data] of winnerMap) {
        winsCount.set(data.participantId, (winsCount.get(data.participantId) || 0) + 1);
      }

      const totalWins = winsCount.get(stat.participantId) || 0;
      const totalRounds = stat.totalRoundsPlayed || 1;
      const winRate = totalRounds > 0 ? Math.round((totalWins / totalRounds) * 100) : 0;

      // Определяем ранг (количество игроков с большим или равным счётом)
      const rankResult = await db
        .select({
          score: sql<number>`COALESCE(SUM(${matchParticipants.score}), 0)`.mapWith(Number),
        })
        .from(matchParticipants)
        .leftJoin(
          matches,
          sql`${matchParticipants.matchId} = ${matches.id}`
        )
        .where(sql`${matches.status} = 'finished'`)
        .groupBy(matchParticipants.id);

      const rank = rankResult.filter(r => r.score > stat.totalScore).length + 1;

      return {
        found: true,
        player: {
          rank,
          userId: stat.userId,
          name: stat.userName || `Игрок ${stat.userId.slice(0, 6)}`,
          totalScore: stat.totalScore,
          matchesPlayed: stat.matchesPlayed,
          wins: totalWins,
          totalRoundsPlayed: stat.totalRoundsPlayed,
          winRate,
          avgReactionTime: stat.avgReactionTime,
          totalFalseStarts: stat.totalFalseStarts,
        },
      };
    }),
});

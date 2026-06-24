import { db } from "../db";
import {
  matches,
  rounds,
  matchParticipants,
  roundResults,
} from "../db/schema";
import { eq, count, and, sql, asc } from "drizzle-orm";
import { ServerTiming } from "../utils/timing";
import { emitMatchEvent } from "../utils/event-stream";

/**
 * Интерфейс результата реакции
 */
export interface ReactionResult {
  participantId: string;
  reactionTime: number | null;
  isFalseStart: boolean;
  isBlind: boolean; // был ли в слепой зоне
}

/**
 * Сервис для управления дуэльными матчами и раундами
 */
export class MatchService {
  /**
   * Создает новый матч с указанными участниками
   */
  static async createMatch(
    participantIds: string[],
    totalRounds: number = 5
  ) {
    if (participantIds.length < 2 || participantIds.length > 5) {
      throw new Error("Матч должен содержать от 2 до 5 игроков");
    }

    // Создаем матч
    const [newMatch] = await db
      .insert(matches)
      .values({
        totalRounds,
        status: "waiting",
      })
      .returning();

    // Добавляем участников
    const participantsData = participantIds.map((userId) => ({
      matchId: newMatch.id,
      userId,
    }));

    await db.insert(matchParticipants).values(participantsData);

    // Создаем записи для раундов (1..N)
    const roundsData = Array.from({ length: totalRounds }, (_, i) => ({
      matchId: newMatch.id,
      roundNumber: i + 1,
      status: "waiting" as const,
    }));

    await db.insert(rounds).values(roundsData);

    // Возвращаем созданный матч с деталями
    return await this.getMatchDetails(newMatch.id);
  }

  /**
   * Присоединяет пользователя к существующему матчу
   */
  static async joinMatch(matchId: string, userId: string) {
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match[0]) {
      throw new Error("Матч не найден");
    }

    if (match[0].status !== "waiting") {
      throw new Error("Матч уже начался или завершен");
    }

    // Проверяем, не занят ли слот
    const existing = await db
      .select()
      .from(matchParticipants)
      .where(
        and(
          eq(matchParticipants.matchId, matchId),
          eq(matchParticipants.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Вы уже в этом матче");
    }

    const currentCount = await db
      .select({ count: count() })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId));

    if (currentCount[0].count >= 5) {
      throw new Error("Матч заполнен (макс. 5 игроков)");
    }

    await db
      .insert(matchParticipants)
      .values({
        matchId,
        userId,
      });

    return await this.getMatchDetails(matchId);
  }

  /**
   * Запускает конкретный раунд
   * Сервер фиксирует момент запуска (signalTime)
   */
  static async startRound(roundId: string) {
    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1);

    if (!round) {
      throw new Error("Раунд не найден");
    }

    if (round.status !== "waiting") {
      throw new Error("Раунд уже запущен или завершен");
    }

    const signalTime = new Date();

    await db
      .update(rounds)
      .set({
        status: "active",
        signalTime,
      })
      .where(eq(rounds.id, roundId));

    // Обновляем статус матча на active
    await db
      .update(matches)
      .set({ status: "active" })
      .where(eq(matches.id, round.matchId));

    // Эмитим событие для SSE-клиентов
    emitMatchEvent({
      matchId: round.matchId,
      type: "ROUND_STARTED",
      payload: { roundId, signalTime },
      timestamp: ServerTiming.now(),
    });

    return {
      ...round,
      signalTime,
    };
  }

  /**
   * Обработка реакции игрока
   * Сервер фиксирует время нажатия и проверяет фальстарт
   * Защита от манипуляций:
   * 1. Время вычисляется на сервере (now - signalTime)
   * 2. Проверка blind zone (задержка после фальстарта)
   * 3. Транзакция с блокировкой строки (for update)
   */
  static async submitReaction(roundId: string, participantId: string) {
    // Получаем matchId заранее для SSE-эмитов
    const [roundData] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1);

    if (!roundData) throw new Error("Раунд не найден");

    // Используем транзакцию для безопасности данных
    const result = await db.transaction(async (tx) => {
      // 1. Получаем данные раунда с блокировкой
      const [round] = await tx
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId))
        .for("update")
        .limit(1);

      if (!round) {
        throw new Error("Раунд не найден");
      }

      if (round.status !== "active") {
        throw new Error("Раунд не активен");
      }

      // 2. Получаем данные участника с блокировкой
      const [participant] = await tx
        .select()
        .from(matchParticipants)
        .where(
          and(
            eq(matchParticipants.id, participantId),
            eq(matchParticipants.matchId, round.matchId)
          )
        )
        .for("update")
        .limit(1);

      if (!participant) {
        throw new Error("Участник не найден в этом матче");
      }

      // 3. Проверяем, не ответил ли уже
      const existingResult = await tx
        .select()
        .from(roundResults)
        .where(eq(roundResults.participantId, participantId))
        .limit(1);

      if (existingResult.length > 0) {
        throw new Error("Участник уже ответил");
      }

      // 4. Фиксируем время реакции сервером
      const now = ServerTiming.nowDate();
      
      // 5. Проверяем "слепую зону" (blind zone) — задержка после фальстарта
      const blindDurationMs = ServerTiming.calculateDelay(participant.delaysApplied);
      const isBlind = ServerTiming.isInBlindZone(round.signalTime!, now, blindDurationMs);
      
      // Если в слепой зоне — считаем как фальстарт
      const isFalseStart = now < round.signalTime! || isBlind;

      let reactionTime: number | null = null;
      if (!isFalseStart) {
        reactionTime = now.getTime() - round.signalTime!.getTime();
      }

      // 6. Сохраняем результат раунда
      await tx.insert(roundResults).values({
        roundId,
        participantId,
        reactionTime,
        isFalseStart,
        finishedAt: now,
      });

      // 7. Если фальстарт — штраф и увеличиваем задержку
      if (isFalseStart) {
        const newFalseStarts = participant.falseStarts + 1;
        const newDelays = participant.delaysApplied + 1;

        await tx
          .update(matchParticipants)
          .set({
            score: participant.score - 1, // штраф 1 балл
            falseStarts: newFalseStarts,
            delaysApplied: newDelays,
          })
          .where(eq(matchParticipants.id, participantId));
      }

      return {
        reactionTime,
        isFalseStart,
        isBlind,
        blindDurationMs,
      };
    });

    // Эмитим событие реакции для SSE
    emitMatchEvent({
      matchId: roundData.matchId,
      type: "REACTION_SUBMITTED",
      payload: { roundId, participantId, isFalseStart: result.isFalseStart, isBlind: result.isBlind },
      timestamp: ServerTiming.now(),
    });

    return result;
  }

  /**
   * Проверяет, закончились ли все игроки в раунде
   * Если да — завершает раунд и определяет победителя
   */
  static async checkRoundCompletion(roundId: string) {
    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1);

    if (round?.status !== "active") return null;

    // Получаем всех участников матча
    const participants = await db
      .select()
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, round.matchId));

    // Получаем результаты
    const results = await db
      .select()
      .from(roundResults)
      .where(eq(roundResults.roundId, roundId));

    // Если все ответили
    if (results.length === participants.length) {
      return await this.finishRound(roundId, round.matchId);
    }

    return null;
  }

  /**
   * Завершает раунд, начисляет очки победителю
   */
  static async finishRound(roundId: string, matchId: string) {
    return await db.transaction(async (tx) => {
      // Получаем результаты
      const results = await tx
        .select()
        .from(roundResults)
        .where(eq(roundResults.roundId, roundId));

      // Находим лучшее время среди тех, кто не фальстартовал
      const validResults = results.filter((r) => !r.isFalseStart);

      let winnerId: string | null = null;

      if (validResults.length > 0) {
        // Сортируем по времени реакции (возрастание)
        validResults.sort(
          (a, b) => (a.reactionTime ?? Infinity) - (b.reactionTime ?? Infinity)
        );
        winnerId = validResults[0].participantId;

        // Начисляем победителю +1 балл
        await tx
          .update(matchParticipants)
          .set({
            score: sql`${matchParticipants.score} + 1`,
          })
          .where(eq(matchParticipants.id, winnerId));
      }

      // Помечаем раунд как завершенный
      await tx
        .update(rounds)
        .set({ status: "finished" })
        .where(eq(rounds.id, roundId));

      // Обновляем прогресс матча
      const match = await tx
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);

      const nextRound = match[0].currentRound + 1;

      let matchStatus = match[0].status;
      if (nextRound > match[0].totalRounds) {
        // Матч завершен
        await tx
          .update(matches)
          .set({ status: "finished" })
          .where(eq(matches.id, matchId));
        matchStatus = "finished";
      } else {
        // Готовим следующий раунд
        const [nextRoundRecord] = await tx
          .select()
          .from(rounds)
          .where(
            and(
              eq(rounds.matchId, matchId),
              eq(rounds.roundNumber, nextRound)
            )
          )
          .limit(1);

        if (nextRoundRecord) {
          await tx
            .update(rounds)
            .set({ status: "waiting" })
            .where(eq(rounds.id, nextRoundRecord.id));
        }

        await tx
          .update(matches)
          .set({ currentRound: nextRound })
          .where(eq(matches.id, matchId));
      }

      // Эмитим событие завершения раунда/матча
      emitMatchEvent({
        matchId,
        type: matchStatus === "finished" ? "MATCH_FINISHED" : "ROUND_FINISHED",
        payload: { winnerId, roundResults: results },
        timestamp: ServerTiming.now(),
      });

      return {
        winnerId,
        roundResults: results,
      };
    });
  }

  /**
   * Получить детали матча с участниками и раундами
   */
  static async getMatchDetails(matchId: string) {
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match[0]) return null;

    const participants = await db
      .select()
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId))
      .orderBy(asc(matchParticipants.score));

    const matchRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.matchId, matchId))
      .orderBy(asc(rounds.roundNumber));

    return {
      ...match[0],
      participants,
      rounds: matchRounds,
    };
  }

  /**
   * Получить историю матчей пользователя
   */
  static async getMatchHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ) {
    const userMatches = await db
      .select({
        match: matches,
        count: count(),
      })
      .from(matches)
      .leftJoin(
        matchParticipants,
        eq(matchParticipants.matchId, matches.id)
      )
      .where(eq(matchParticipants.userId, userId))
      .groupBy(matches.id)
      .orderBy(matches.createdAt)
      .limit(limit)
      .offset(offset);

    return userMatches.map((m) => m.match);
  }
}

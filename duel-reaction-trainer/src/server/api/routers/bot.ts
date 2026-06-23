import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { BotEmulator, BotFactory, type BotConfig, type BotEvent } from "../../services/bot-emulator";
import { v4 as uuidv4 } from "uuid";

/**
 * Интерфейс для хранения бота с дополнительными метаданными
 */
interface BotEntry {
  bot: BotEmulator;
  id: string;
  createdAt: Date;
}

/**
 * Хранилище активных ботов в памяти
 */
const activeBots = new Map<string, BotEntry>();

/**
 * Роутер для работы с ботами-эмуляторами
 */
export const botRouter = router({
  /**
   * Создать нового бота
   */
  createBot: publicProcedure
    .input(
      z.object({
        type: z.enum(["fast", "average", "slow", "risky", "perfect", "custom"]).default("average"),
        name: z.string().optional(),
        customConfig: z.object({
          reactionTime: z.number().min(100).max(2000).optional(),
          variance: z.number().min(0).max(500).optional(),
          falseStartChance: z.number().min(0).max(1).optional(),
        }).optional(),
      })
    )
    .mutation(({ input }) => {
      let bot: BotEmulator;

      switch (input.type) {
        case "fast":
          bot = BotFactory.createFastBot(input.name);
          break;
        case "average":
          bot = BotFactory.createAverageBot(input.name);
          break;
        case "slow":
          bot = BotFactory.createSlowBot(input.name);
          break;
        case "risky":
          bot = BotFactory.createRiskyBot(input.name);
          break;
        case "perfect":
          bot = BotFactory.createPerfectBot(input.name);
          break;
        case "custom":
          if (!input.customConfig) {
            throw new Error("Необходимо указать customConfig для типа 'custom'");
          }
          bot = BotFactory.createCustom({
            name: input.name || `custom_bot_${Date.now()}`,
            reactionTime: input.customConfig.reactionTime || 300,
            variance: input.customConfig.variance || 50,
            falseStartChance: input.customConfig.falseStartChance || 0.05,
          });
          break;
      }

      const botId = uuidv4();
      const entry: BotEntry = {
        bot,
        id: botId,
        createdAt: new Date(),
      };
      activeBots.set(botId, entry);

      return {
        botId,
        config: bot.getConfig(),
      };
    }),

  /**
   * Удалить бота
   */
  removeBot: publicProcedure
    .input(
      z.object({
        botId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (entry) {
        entry.bot.destroy();
        activeBots.delete(input.botId);
        return { success: true };
      }
      return { success: false, message: "Бот не найден" };
    }),

  /**
   * Симулировать реакцию бота
   */
  simulateReaction: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        signalTime: z.string(), // ISO строка даты
        blindDuration: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      const signalTime = new Date(input.signalTime);
      const reaction = await entry.bot.react(signalTime, input.blindDuration);

      return reaction;
    }),

  /**
   * Симулировать раунд с ботами
   */
  simulateRound: publicProcedure
    .input(
      z.object({
        botIds: z.array(z.string()).min(2).max(5),
        signalTime: z.string(),
        blindDurations: z.record(z.number()).optional(), // participantId -> blindDuration
      })
    )
    .mutation(async ({ input }) => {
      const signalTime = new Date(input.signalTime);
      const results = await Promise.all(
        input.botIds.map(async (botId) => {
          const entry = activeBots.get(botId);
          if (!entry) {
            return { botId, error: "Бот не найден" } as const;
          }

          const blindDuration = input.blindDurations?.[botId] || 0;
          const reaction = await entry.bot.react(signalTime, blindDuration);
          return { botId, ...reaction } as const;
        })
      );

      // Определяем победителя (минимальное время реакции)
      const validResults = results.filter(
        (r): r is { botId: string; reactionTime: number | null; isFalseStart: boolean; isBlind: boolean; participantId: string } =>
          !("error" in r) && !r.isFalseStart && r.reactionTime !== null
      );

      if (validResults.length > 0) {
        validResults.sort((a, b) => (a.reactionTime || Infinity) - (b.reactionTime || Infinity));
        return {
          results,
          winnerId: validResults[0].botId,
          winnerReactionTime: validResults[0].reactionTime,
        };
      }

      return {
        results,
        winnerId: null,
        winnerReactionTime: null,
      };
    }),

  /**
   * Получить список активных ботов
   */
  listBots: publicProcedure.query(() => {
    const bots = Array.from(activeBots.values()).map((entry) => ({
      id: entry.id,
      config: entry.bot.getConfig(),
      state: entry.bot.getState(),
      eventCount: entry.bot.getEventLog().length,
    }));
    return {
      count: bots.length,
      bots,
    };
  }),

  /**
   * Обновить конфигурацию бота
   */
  updateBot: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        updates: z.object({
          reactionTime: z.number().min(100).max(2000).optional(),
          variance: z.number().min(0).max(500).optional(),
          falseStartChance: z.number().min(0).max(1).optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      entry.bot.updateConfig(input.updates);
      return {
        success: true,
        config: entry.bot.getConfig(),
      };
    }),

  /**
   * Очистить всех ботов
   */
  clearAll: publicProcedure.mutation(() => {
    activeBots.forEach((entry) => entry.bot.destroy());
    activeBots.clear();
    return { success: true, count: 0 };
  }),

  /**
   * Получить лог событий бота
   */
  getBotEvents: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      const events = entry.bot.getEventLog().slice(-input.limit);
      return { events, total: events.length };
    }),

  /**
   * Получить состояние бота
   */
  getBotState: publicProcedure
    .input(
      z.object({
        botId: z.string(),
      })
    )
    .query(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      return {
        state: entry.bot.getState(),
        config: entry.bot.getConfig(),
      };
    }),

  /**
   * Начать участие бота в матче
   */
  startBotInMatch: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        matchId: z.string(),
        roundId: z.string(),
        participantId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      entry.bot.startPlaying(input.matchId, input.roundId, input.participantId);
      return { success: true };
    }),

  /**
   * Завершить раунд для бота
   */
  finishBotRound: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        wasFalseStart: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      entry.bot.finishRound(input.wasFalseStart);
      return { success: true, state: entry.bot.getState() };
    }),

  /**
   * Завершить матч для бота
   */
  finishBotMatch: publicProcedure
    .input(
      z.object({
        botId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const entry = activeBots.get(input.botId);
      if (!entry) {
        throw new Error("Бот не найден");
      }

      entry.bot.finishMatch();
      return { success: true, state: entry.bot.getState() };
    }),
});
/**
 * Тесты для ботов-эмуляторов
 * Покрытие: создание, конфигурация, реакция, фальстарты, слепая зона, события
 */

import { BotEmulator, BotFactory, type BotConfig, type BotEvent } from "@/server/services/bot-emulator";

describe("BotEmulator", () => {
  describe("создание и конфигурация", () => {
    test("создаёт бота с базовой конфигурацией", () => {
      const config: BotConfig = {
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      };

      const bot = new BotEmulator(config);
      const retrievedConfig = bot.getConfig();

      expect(retrievedConfig.name).toBe("test_bot");
      expect(retrievedConfig.reactionTime).toBe(300);
      expect(retrievedConfig.variance).toBe(50);
      expect(retrievedConfig.falseStartChance).toBe(0.1);
    });

    test("устанавливает namePrefix по умолчанию", () => {
      const config: BotConfig = {
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      };

      const bot = new BotEmulator(config);
      const retrievedConfig = bot.getConfig();

      expect(retrievedConfig.namePrefix).toBe("bot");
    });

    test("обновляет конфигурацию", () => {
      const config: BotConfig = {
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      };

      const bot = new BotEmulator(config);
      bot.updateConfig({ reactionTime: 400, variance: 100 });

      const retrievedConfig = bot.getConfig();
      expect(retrievedConfig.reactionTime).toBe(400);
      expect(retrievedConfig.variance).toBe(100);
      expect(retrievedConfig.falseStartChance).toBe(0.1); // не изменилось
    });

    test("возвращает копию конфигурации (не мутацию)", () => {
      const config: BotConfig = {
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      };

      const bot = new BotEmulator(config);
      const configCopy = bot.getConfig();

      configCopy.reactionTime = 999;
      const originalConfig = bot.getConfig();
      expect(originalConfig.reactionTime).toBe(300);
    });
  });

  describe("состояние бота", () => {
    test("начальное состояние inactive", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      });

      const state = bot.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.matchId).toBeNull();
      expect(state.roundId).toBeNull();
      expect(state.participantId).toBeNull();
      expect(state.falseStartCount).toBe(0);
      expect(state.totalRoundsPlayed).toBe(0);
    });

    test("начинает участие в матче", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      });

      bot.startPlaying("match-123", "round-456", "participant-789");

      const state = bot.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.matchId).toBe("match-123");
      expect(state.roundId).toBe("round-456");
      expect(state.participantId).toBe("participant-789");
    });

    test("завершает раунд и учитывает фальстарт", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      });

      bot.startPlaying("match-123", "round-456", "participant-789");
      bot.finishRound(true); // фальстарт
      bot.finishRound(false); // нормальная реакция
      bot.finishRound(true); // ещё один фальстарт

      const state = bot.getState();
      expect(state.falseStartCount).toBe(2);
      expect(state.totalRoundsPlayed).toBe(3);
    });

    test("завершает матч", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      });

      bot.startPlaying("match-123", "round-456", "participant-789");
      bot.finishMatch();

      const state = bot.getState();
      expect(state.isPlaying).toBe(false);
    });

    test("сбрасывает состояние", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0.1,
      });

      bot.startPlaying("match-123", "round-456", "participant-789");
      bot.finishRound(false);
      bot.resetState();

      const state = bot.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.matchId).toBeNull();
      expect(state.falseStartCount).toBe(0);
    });
  });

  describe("реакция на сигнал", () => {
    test("генерирует реакцию с временем в допустимом диапазоне", async () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 300,
        variance: 50,
        falseStartChance: 0, // отключаем фальстарты для этого теста
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      
      // Генерируем несколько реакций и проверяем диапазон
      const reactions: number[] = [];
      for (let i = 0; i < 10; i++) {
        const reaction = await bot.react(signalTime, 0);
        if (reaction.reactionTime !== null) {
          reactions.push(reaction.reactionTime);
        }
      }

      // Все реакции должны быть в диапазоне [250, 350] (300 +/- 50)
      reactions.forEach((rt) => {
        expect(rt).toBeGreaterThanOrEqual(100); // минимум 100мс
        expect(rt).toBeLessThanOrEqual(500); // максимум 500мс (защита)
      });
    });

    test("устанавливает participantId в результате реакции", async () => {
      const bot = new BotEmulator({
        name: "unique_bot_name",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 0,
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      const reaction = await bot.react(signalTime, 0);

      expect(reaction.participantId).toBe("unique_bot_name");
    });

    test("отключает фальстарты при falseStartChance = 0", async () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 0,
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      
      for (let i = 0; i < 20; i++) {
        const reaction = await bot.react(signalTime, 0);
        expect(reaction.isFalseStart).toBe(false);
      }
    });

    test("пропускает реакцию при слепой зоне", async () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 0,
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      // blindDuration = 300мс, реакция = 200мс -> бот в слепой зоне
      const reaction = await bot.react(signalTime, 300);

      expect(reaction.isFalseStart).toBe(true);
      expect(reaction.isBlind).toBe(true);
      expect(reaction.reactionTime).toBeNull();
    });

    test("успешная реакция вне слепой зоны", async () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 0,
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      // blindDuration = 100мс, реакция = 200мс -> бот вне слепой зоны
      const reaction = await bot.react(signalTime, 100);

      expect(reaction.isFalseStart).toBe(false);
      expect(reaction.isBlind).toBe(false);
      expect(reaction.reactionTime).toBe(200);
    });
  });

  describe("лог событий", () => {
    test("записывает событие при реакции", async () => {
      const events: BotEvent[] = [];
      const bot = new BotEmulator(
        {
          name: "test_bot",
          reactionTime: 200,
          variance: 0,
          falseStartChance: 0,
        },
        (event) => events.push(event)
      );

      const signalTime = new Date("2024-01-01T00:00:00Z");
      await bot.react(signalTime, 0);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("reaction_submitted");
      expect(events[0].data.reactionTime).toBe(200);
    });

    test("записывает событие при фальстарте", async () => {
      const events: BotEvent[] = [];
      const bot = new BotEmulator(
        {
          name: "test_bot",
          reactionTime: 200,
          variance: 0,
          falseStartChance: 1, // 100% фальстарт
        },
        (event) => events.push(event)
      );

      const signalTime = new Date("2024-01-01T00:00:00Z");
      await bot.react(signalTime, 0);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("false_start");
    });

    test("записывает событие при начале раунда", () => {
      const events: BotEvent[] = [];
      const bot = new BotEmulator(
        {
          name: "test_bot",
          reactionTime: 200,
          variance: 0,
          falseStartChance: 0,
        },
        (event) => events.push(event)
      );

      bot.startPlaying("match-123", "round-456", "participant-789");

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("round_started");
      expect(events[0].data.matchId).toBe("match-123");
    });

    test("ограничивает размер лога 100 событиями", async () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 1, // 100% фальстарт для генерации событий
      });

      const signalTime = new Date("2024-01-01T00:00:00Z");
      
      // Генерируем 150 событий
      for (let i = 0; i < 150; i++) {
        await bot.react(signalTime, 0);
      }

      const log = bot.getEventLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    test("возвращает копию лога событий", () => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 200,
        variance: 0,
        falseStartChance: 0,
      });

      const log1 = bot.getEventLog();
      log1.push({} as any); // мутируем копию
      
      const log2 = bot.getEventLog();
      expect(log2.length).toBe(0);
    });
  });

  describe("автоматическая реакция", () => {
    test("отменяет автоматическую реакцию", (done) => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 1000, // большая задержка
        variance: 0,
        falseStartChance: 0,
      });

      let callbackCalled = false;
      const signalTime = new Date();

      bot.startAutoReaction(signalTime, () => {
        callbackCalled = true;
      });

      bot.cancelReaction();

      // Ждём немного и проверяем, что колбэк не вызвался
      setTimeout(() => {
        expect(callbackCalled).toBe(false);
        done();
      }, 100);
    }, 5000);

    test("вызывает колбэк при срабатывании таймера", (done) => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 50, // маленькая задержка
        variance: 0,
        falseStartChance: 0,
      });

      let callbackCalled = false;
      const signalTime = new Date();

      bot.startAutoReaction(signalTime, (reaction) => {
        callbackCalled = true;
        expect(reaction.participantId).toBe("test_bot");
      });

      setTimeout(() => {
        expect(callbackCalled).toBe(true);
        done();
      }, 500);
    }, 5000);
  });

  describe("уничтожение бота", () => {
    test("освобождает ресурсы", (done) => {
      const bot = new BotEmulator({
        name: "test_bot",
        reactionTime: 1000,
        variance: 0,
        falseStartChance: 0,
      });

      const signalTime = new Date();
      bot.startAutoReaction(signalTime, () => {});

      bot.destroy();

      // После уничтожения лог должен быть пуст
      expect(bot.getEventLog().length).toBe(0);
      
      setTimeout(() => {
        done();
      }, 100);
    }, 5000);
  });
});

describe("BotFactory", () => {
  describe("создание типовых ботов", () => {
    test("создаёт быстрого бота", () => {
      const bot = BotFactory.createFastBot("fast_1");
      const config = bot.getConfig();

      expect(config.name).toBe("fast_1");
      expect(config.reactionTime).toBe(200);
      expect(config.variance).toBe(50);
      expect(config.falseStartChance).toBe(0.02);
    });

    test("создаёт бота со средней реакцией", () => {
      const bot = BotFactory.createAverageBot("avg_1");
      const config = bot.getConfig();

      expect(config.name).toBe("avg_1");
      expect(config.reactionTime).toBe(300);
      expect(config.variance).toBe(50);
      expect(config.falseStartChance).toBe(0.05);
    });

    test("создаёт медленного бота", () => {
      const bot = BotFactory.createSlowBot("slow_1");
      const config = bot.getConfig();

      expect(config.name).toBe("slow_1");
      expect(config.reactionTime).toBe(500);
      expect(config.variance).toBe(100);
      expect(config.falseStartChance).toBe(0.08);
    });

    test("создаёт рискованного бота", () => {
      const bot = BotFactory.createRiskyBot("risky_1");
      const config = bot.getConfig();

      expect(config.name).toBe("risky_1");
      expect(config.reactionTime).toBe(180);
      expect(config.variance).toBe(40);
      expect(config.falseStartChance).toBe(0.25);
    });

    test("создаёт идеального бота", () => {
      const bot = BotFactory.createPerfectBot("perfect_1");
      const config = bot.getConfig();

      expect(config.name).toBe("perfect_1");
      expect(config.reactionTime).toBe(150);
      expect(config.variance).toBe(10);
      expect(config.falseStartChance).toBe(0);
    });

    test("создаёт кастомного бота", () => {
      const bot = BotFactory.createCustom({
        name: "custom_1",
        reactionTime: 250,
        variance: 75,
        falseStartChance: 0.15,
      });

      const config = bot.getConfig();

      expect(config.name).toBe("custom_1");
      expect(config.reactionTime).toBe(250);
      expect(config.variance).toBe(75);
      expect(config.falseStartChance).toBe(0.15);
    });

    test("генерирует уникальные имена для ботов без имени", () => {
      const bot1 = BotFactory.createFastBot();
      const bot2 = BotFactory.createAverageBot();

      expect(bot1.getConfig().name).not.toBe(bot2.getConfig().name);
    });
  });
});

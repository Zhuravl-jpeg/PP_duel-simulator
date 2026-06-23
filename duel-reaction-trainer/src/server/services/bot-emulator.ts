/**
 * Бот-эмулятор игрока с настраиваемой реакцией
 * Используется для тестирования и демонстрации игры
 */

import { v4 as uuidv4 } from "uuid";

export interface BotConfig {
  name: string;
  reactionTime: number; // мс, среднее время реакции
  variance: number; // мс, случайное отклонение
  falseStartChance: number; // вероятность фальстарта (0-1)
  namePrefix?: string; // префикс для имени бота
}

export interface BotReaction {
  participantId: string;
  reactionTime: number | null; // null если фальстарт
  isFalseStart: boolean;
  isBlind: boolean;
}

export interface BotState {
  isPlaying: boolean;
  matchId: string | null;
  roundId: string | null;
  participantId: string | null;
  falseStartCount: number;
  totalRoundsPlayed: number;
}

export type BotEventType = 
  | "round_started"
  | "reaction_submitted"
  | "false_start"
  | "round_finished"
  | "match_finished"
  | "blind_zone";

export interface BotEvent {
  timestamp: Date;
  type: BotEventType;
  data: Record<string, any>;
}

export class BotEmulator {
  private config: BotConfig;
  private reactionTimeout: NodeJS.Timeout | null = null;
  private state: BotState;
  private eventLog: BotEvent[];
  private onEvent?: (event: BotEvent) => void;

  constructor(config: BotConfig, onEvent?: (event: BotEvent) => void) {
    this.config = {
      namePrefix: "bot",
      ...config,
    };
    this.state = {
      isPlaying: false,
      matchId: null,
      roundId: null,
      participantId: null,
      falseStartCount: 0,
      totalRoundsPlayed: 0,
    };
    this.eventLog = [];
    this.onEvent = onEvent;
  }

  /**
   * Генерирует время реакции бота с учётом дисперсии
   */
  private generateReactionTime(): number {
    const base = this.config.reactionTime;
    const variance = this.config.variance;
    // Случайное значение в диапазоне [base - variance, base + variance]
    return Math.max(
      100, // минимум 100мс
      base + (Math.random() * 2 - 1) * variance
    );
  }

  /**
   * Определяет, будет ли бот делать фальстарт
   */
  private shouldFalseStart(): boolean {
    return Math.random() < this.config.falseStartChance;
  }

  /**
   * Логгирует событие бота
   */
  private logEvent(type: BotEventType, data: Record<string, any> = {}): void {
    const event: BotEvent = {
      timestamp: new Date(),
      type,
      data,
    };
    this.eventLog.push(event);
    // Храним максимум 100 событий в логе
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }
    this.onEvent?.(event);
  }

  /**
   * Эмулирует реакцию бота на сигнал
   * @param signalTime - время появления сигнала
   * @param blindDuration - длительность слепой зоны (если есть)
   * @returns результат реакции бота
   */
  async react(
    signalTime: Date,
    blindDuration: number = 0
  ): Promise<BotReaction> {
    // Проверяем фальстарт
    if (this.shouldFalseStart()) {
      this.logEvent("false_start", { 
        signalTime: signalTime.toISOString(),
        blindDuration 
      });
      
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: false,
      };
    }

    // Генерируем время реакции
    const reactionTime = this.generateReactionTime();
    
    // Проверяем слепую зону
    const isBlind = reactionTime < blindDuration;

    // Если в слепой зоне - считаем как фальстарт
    if (isBlind) {
      this.logEvent("blind_zone", { 
        reactionTime, 
        blindDuration 
      });
      
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: true,
      };
    }

    this.logEvent("reaction_submitted", { 
      reactionTime, 
      signalTime: signalTime.toISOString() 
    });

    return {
      participantId: this.config.name,
      reactionTime,
      isFalseStart: false,
      isBlind: false,
    };
  }

  /**
   * Эмулирует реакцию с задержкой (для автоматического нажатия)
   * @param signalTime - время сигнала
   * @param callback - функция, вызываемая при реакции
   * @param blindDuration - длительность слепой зоны
   * @returns ID таймера для отмены
   */
  startAutoReaction(
    signalTime: Date,
    callback: (reaction: BotReaction) => void,
    blindDuration: number = 0
  ): string {
    const reactionTime = this.generateReactionTime();
    const delay = reactionTime;

    this.reactionTimeout = setTimeout(() => {
      const reaction = this.reactSync(signalTime, blindDuration);
      callback(reaction);
      this.reactionTimeout = null;
    }, delay);

    return this.config.name;
  }

  /**
   * Синхронная версия реакции (без задержки)
   */
  private reactSync(signalTime: Date, blindDuration: number): BotReaction {
    if (this.shouldFalseStart()) {
      this.logEvent("false_start", { 
        signalTime: signalTime.toISOString(),
        blindDuration 
      });
      
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: false,
      };
    }

    const reactionTime = this.generateReactionTime();
    const isBlind = reactionTime < blindDuration;

    if (isBlind) {
      this.logEvent("blind_zone", { reactionTime, blindDuration });
      
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: true,
      };
    }

    this.logEvent("reaction_submitted", { reactionTime });

    return {
      participantId: this.config.name,
      reactionTime,
      isFalseStart: false,
      isBlind: false,
    };
  }

  /**
   * Отменяет автоматическую реакцию
   */
  cancelReaction(): void {
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }
  }

  /**
   * Обновляет конфигурацию бота
   */
  updateConfig(config: Partial<BotConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получает текущую конфигурацию
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * Получает текущее состояние бота
   */
  getState(): BotState {
    return { ...this.state };
  }

  /**
   * Получает лог событий бота
   */
  getEventLog(): BotEvent[] {
    return [...this.eventLog];
  }

  /**
   * Начинает участие бота в матче
   */
  startPlaying(
    matchId: string, 
    roundId: string, 
    participantId: string
  ): void {
    this.state.isPlaying = true;
    this.state.matchId = matchId;
    this.state.roundId = roundId;
    this.state.participantId = participantId;
    
    this.logEvent("round_started", { matchId, roundId, participantId });
  }

  /**
   * Завершает участие бота в матче
   */
  finishRound(wasFalseStart: boolean): void {
    if (wasFalseStart) {
      this.state.falseStartCount++;
    }
    this.state.totalRoundsPlayed++;
    
    this.logEvent("round_finished", { 
      wasFalseStart, 
      falseStartCount: this.state.falseStartCount,
      totalRoundsPlayed: this.state.totalRoundsPlayed 
    });
  }

  /**
   * Завершает матч
   */
  finishMatch(): void {
    this.state.isPlaying = false;
    
    this.logEvent("match_finished", { 
      matchId: this.state.matchId,
      falseStartCount: this.state.falseStartCount,
      totalRoundsPlayed: this.state.totalRoundsPlayed 
    });
  }

  /**
   * Сбрасывает состояние бота
   */
  resetState(): void {
    this.state = {
      isPlaying: false,
      matchId: null,
      roundId: null,
      participantId: null,
      falseStartCount: 0,
      totalRoundsPlayed: 0,
    };
  }

  /**
   * Уничтожает бота и освобождает ресурсы
   */
  destroy(): void {
    this.cancelReaction();
    this.eventLog = [];
  }
}

/**
 * Фабрика для создания ботов с типовыми конфигурациями
 */
export class BotFactory {
  private static counter = 0;

  /**
   * Создаёт бота с быстрой реакцией (150-250мс)
   */
  static createFastBot(name?: string, onEvent?: (event: BotEvent) => void): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_fast_${BotFactory.counter}`,
      reactionTime: 200,
      variance: 50,
      falseStartChance: 0.02,
    }, onEvent);
  }

  /**
   * Создаёт бота со средней реакцией (250-350мс)
   */
  static createAverageBot(name?: string, onEvent?: (event: BotEvent) => void): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_avg_${BotFactory.counter}`,
      reactionTime: 300,
      variance: 50,
      falseStartChance: 0.05,
    }, onEvent);
  }

  /**
   * Создаёт бота с медленной реакцией (400-600мс)
   */
  static createSlowBot(name?: string, onEvent?: (event: BotEvent) => void): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_slow_${BotFactory.counter}`,
      reactionTime: 500,
      variance: 100,
      falseStartChance: 0.08,
    }, onEvent);
  }

  /**
   * Создаёт бота с высокой вероятностью фальстарта
   */
  static createRiskyBot(name?: string, onEvent?: (event: BotEvent) => void): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_risky_${BotFactory.counter}`,
      reactionTime: 180,
      variance: 40,
      falseStartChance: 0.25,
    }, onEvent);
  }

  /**
   * Создаёт идеального бота (150мс, 0% фальстартов)
   */
  static createPerfectBot(name?: string, onEvent?: (event: BotEvent) => void): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_perfect_${BotFactory.counter}`,
      reactionTime: 150,
      variance: 10,
      falseStartChance: 0,
    }, onEvent);
  }

  /**
   * Создаёт бота с настраиваемыми параметрами
   */
  static createCustom(
    config: Omit<BotConfig, "namePrefix">,
    onEvent?: (event: BotEvent) => void
  ): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      ...config,
      namePrefix: "bot",
    }, onEvent);
  }
}

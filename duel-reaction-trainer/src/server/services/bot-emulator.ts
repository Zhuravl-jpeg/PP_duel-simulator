/**
 * Бот-эмулятор игрока с настраиваемой реакцией
 * Используется для тестирования и демонстрации игры
 */

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

export class BotEmulator {
  private config: BotConfig;
  private reactionTimeout: NodeJS.Timeout | null = null;

  constructor(config: BotConfig) {
    this.config = {
      namePrefix: "bot",
      ...config,
    };
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
      // Фальстарт: нажимаем ДО сигнала
      const falseStartTime = new Date(signalTime.getTime() - 50 - Math.random() * 100);
      
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
    const responseTime = new Date(signalTime.getTime() + reactionTime);
    const isBlind = responseTime.getTime() - signalTime.getTime() < blindDuration;

    // Если в слепой зоне - считаем как фальстарт
    if (isBlind) {
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: true,
      };
    }

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
      return {
        participantId: this.config.name,
        reactionTime: null,
        isFalseStart: true,
        isBlind: true,
      };
    }

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
   * Уничтожает бота и освобождает ресурсы
   */
  destroy(): void {
    this.cancelReaction();
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
  static createFastBot(name?: string): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_fast_${BotFactory.counter}`,
      reactionTime: 200,
      variance: 50,
      falseStartChance: 0.02,
    });
  }

  /**
   * Создаёт бота со средней реакцией (250-350мс)
   */
  static createAverageBot(name?: string): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_avg_${BotFactory.counter}`,
      reactionTime: 300,
      variance: 50,
      falseStartChance: 0.05,
    });
  }

  /**
   * Создаёт бота с медленной реакцией (400-600мс)
   */
  static createSlowBot(name?: string): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_slow_${BotFactory.counter}`,
      reactionTime: 500,
      variance: 100,
      falseStartChance: 0.08,
    });
  }

  /**
   * Создаёт бота с высокой вероятностью фальстарта
   */
  static createRiskyBot(name?: string): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_risky_${BotFactory.counter}`,
      reactionTime: 180,
      variance: 40,
      falseStartChance: 0.25,
    });
  }

  /**
   * Создаёт идеального бота (150мс, 0% фальстартов)
   */
  static createPerfectBot(name?: string): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      name: name || `bot_perfect_${BotFactory.counter}`,
      reactionTime: 150,
      variance: 10,
      falseStartChance: 0,
    });
  }

  /**
   * Создаёт бота с настраиваемыми параметрами
   */
  static createCustom(config: Omit<BotConfig, "namePrefix">): BotEmulator {
    BotFactory.counter++;
    return new BotEmulator({
      ...config,
      namePrefix: "bot",
    });
  }
}

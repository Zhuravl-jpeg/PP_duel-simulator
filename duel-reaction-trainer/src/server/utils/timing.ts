/**
 * Утилита для работы с серверным временем
 * Все временные метки генерируются на сервере для защиты от манипуляций
 */

export class ServerTiming {
  /**
   * Получает точное время сервера в миллисекундах
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Получает точное время сервера в Date
   */
  static nowDate(): Date {
    return new Date();
  }

  /**
   * Вычисляет задержку для следующего раунда после фальстарта
   * Формула: 500ms + (количество фальстартов * 200ms)
   * Минимум 500ms, максимум 3000ms
   */
  static calculateDelay(falseStartCount: number): number {
    const baseDelay = 500;
    const penaltyPerFalseStart = 200;
    const maxDelay = 3000;

    const calculated = baseDelay + falseStartCount * penaltyPerFalseStart;
    return Math.min(calculated, maxDelay);
  }

  /**
   * Проверяет, находится ли время в "слепой зоне" (blind zone)
   * После фальстарта игрок не видит сигнал первые N миллисекунд
   */
  static isInBlindZone(signalTime: Date, currentResponseTime: Date, blindDurationMs: number): boolean {
    const elapsed = currentResponseTime.getTime() - signalTime.getTime();
    return elapsed < blindDurationMs;
  }

  /**
   * Генерирует уникальный ID для синхронизации сигнала
   * Используется для отслеживания "сессий" сигнала
   */
  static generateSignalId(): string {
    return `sig_${ServerTiming.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Проверяет, прошло ли достаточно времени между запросами
   * Защита от "spam" нажатий
   */
  static canSubmitReaction(
    lastReactionTime: Date | null,
    minIntervalMs: number = 100
  ): boolean {
    if (!lastReactionTime) return true;
    return ServerTiming.now() - lastReactionTime.getTime() >= minIntervalMs;
  }
}

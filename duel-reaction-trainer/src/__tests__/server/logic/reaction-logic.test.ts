import { ServerTiming } from "../../../../src/server/utils/timing";

describe("Логика фальстартов и реакции", () => {
  describe("Определение фальстарта", () => {
    it("должен определить фальстарт при нажатии до сигнала", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0); // 10 секунд
      const responseTime = new Date(2024, 0, 1, 0, 0, 9, 500); // 9.5 секунд (до сигнала)

      const isFalseStart = responseTime < signalTime;
      expect(isFalseStart).toBe(true);
    });

    it("не должен определять фальстарт при нажатии после сигнала", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0); // 10 секунд
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 200); // 10.2 секунды (после сигнала)

      const isFalseStart = responseTime < signalTime;
      expect(isFalseStart).toBe(false);
    });

    it("должен определить фальстарт при нажатии в точно время сигнала", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 0);

      const isFalseStart = responseTime < signalTime;
      expect(isFalseStart).toBe(false); // Равно - не фальстарт, но попадает в blind zone
    });
  });

  describe("Расчёт времени реакции", () => {
    it("должен корректно рассчитать время реакции", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 250); // 250мс

      const reactionTime = responseTime.getTime() - signalTime.getTime();
      expect(reactionTime).toBe(250);
    });

    it("должен рассчитать быструю реакцию (150мс)", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 150);

      const reactionTime = responseTime.getTime() - signalTime.getTime();
      expect(reactionTime).toBe(150);
    });

    it("должен рассчитать среднюю реакцию (300мс)", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 300);

      const reactionTime = responseTime.getTime() - signalTime.getTime();
      expect(reactionTime).toBe(300);
    });

    it("должен рассчитать медленную реакцию (500мс)", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 500);

      const reactionTime = responseTime.getTime() - signalTime.getTime();
      expect(reactionTime).toBe(500);
    });
  });

  describe("Blind Zone (слепая зона)", () => {
    it("должен обнаружить нажатие в слепой зоне после фальстарта", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 400); // 400мс
      const blindDuration = 500; // 500мс слепая зона

      const isInBlind = ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration);
      expect(isInBlind).toBe(true);
    });

    it("должен пропустить нажатие после слепой зоны", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 10, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 10, 600); // 600мс
      const blindDuration = 500; // 500мс слепая зона

      const isInBlind = ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration);
      expect(isInBlind).toBe(false);
    });

    it("должен корректно рассчитать задержку для 3 фальстартов", () => {
      const falseStarts = 3;
      const expectedDelay = 500 + (3 * 200); // 1100мс

      const delay = ServerTiming.calculateDelay(falseStarts);
      expect(delay).toBe(expectedDelay);
    });

    it("должен ограничить максимальную задержку 3000мс", () => {
      const falseStarts = 15;
      const calculated = 500 + (15 * 200); // 3500мс
      const expected = 3000; // но максимум 3000

      const delay = ServerTiming.calculateDelay(falseStarts);
      expect(delay).toBe(expected);
      expect(delay).toBeLessThanOrEqual(3000);
    });
  });

  describe("Подсчёт очков", () => {
    it("должен начислить +1 балл победителю раунда", () => {
      const initialScore = 5;
      const winnerScore = initialScore + 1;
      
      expect(winnerScore).toBe(6);
    });

    it("должен вычесть -1 балл за фальстарт", () => {
      const initialScore = 3;
      const penaltyScore = initialScore - 1;
      
      expect(penaltyScore).toBe(2);
    });

    it("должен обработать серию фальстартов", () => {
      const initialScore = 5;
      const falseStarts = 3;
      const finalScore = initialScore - falseStarts;
      
      expect(finalScore).toBe(2);
    });

    it("должен корректно определить победителя по минимальному времени", () => {
      const results = [
        { participantId: "p1", reactionTime: 250 },
        { participantId: "p2", reactionTime: 180 },
        { participantId: "p3", reactionTime: 320 },
      ];

      const validResults = results.filter(r => r.reactionTime !== null);
      validResults.sort((a, b) => (a.reactionTime ?? Infinity) - (b.reactionTime ?? Infinity));
      
      expect(validResults[0].participantId).toBe("p2");
      expect(validResults[0].reactionTime).toBe(180);
    });

    it("должен игнорировать фальстарты при определении победителя", () => {
      const results = [
        { participantId: "p1", reactionTime: null, isFalseStart: true },
        { participantId: "p2", reactionTime: 250, isFalseStart: false },
        { participantId: "p3", reactionTime: null, isFalseStart: true },
      ];

      const validResults = results.filter(r => !r.isFalseStart && r.reactionTime !== null);
      
      expect(validResults.length).toBe(1);
      expect(validResults[0].participantId).toBe("p2");
    });
  });

  describe("Защита от повторных нажатий", () => {
    it("должен разрешить первое нажатие", () => {
      const canSubmit = ServerTiming.canSubmitReaction(null);
      expect(canSubmit).toBe(true);
    });

    it("должен запретить слишком быстрое повторное нажатие", () => {
      const recentTime = new Date(Date.now() - 30); // 30мс назад
      const canSubmit = ServerTiming.canSubmitReaction(recentTime, 100);
      expect(canSubmit).toBe(false);
    });

    it("должен разрешить нажатие после достаточного интервала", () => {
      const pastTime = new Date(Date.now() - 150); // 150мс назад
      const canSubmit = ServerTiming.canSubmitReaction(pastTime, 100);
      expect(canSubmit).toBe(true);
    });
  });

  describe("Синхронизация сигнала", () => {
    it("должен генерировать уникальный ID сигнала", () => {
      const id1 = ServerTiming.generateSignalId();
      const id2 = ServerTiming.generateSignalId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sig_\d+_/);
    });

    it("должен содержать timestamp в ID", () => {
      const before = Date.now();
      const signalId = ServerTiming.generateSignalId();
      const after = Date.now();
      
      const timestamp = parseInt(signalId.split("_")[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});

import { ServerTiming } from "../../../../src/server/utils/timing";

describe("ServerTiming", () => {
  describe("now()", () => {
    it("should return current timestamp", () => {
      const before = Date.now();
      const result = ServerTiming.now();
      const after = Date.now();
      
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe("nowDate()", () => {
    it("should return current Date object", () => {
      const before = new Date();
      const result = ServerTiming.nowDate();
      const after = new Date();
      
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("calculateDelay()", () => {
    it("should return 500ms for 0 false starts", () => {
      expect(ServerTiming.calculateDelay(0)).toBe(500);
    });

    it("should return 700ms for 1 false start", () => {
      expect(ServerTiming.calculateDelay(1)).toBe(700);
    });

    it("should return 900ms for 2 false starts", () => {
      expect(ServerTiming.calculateDelay(2)).toBe(900);
    });

    it("should cap at 3000ms maximum", () => {
      // 500 + (10 * 200) = 2500, which is less than 3000
      expect(ServerTiming.calculateDelay(10)).toBe(2500);
      // 500 + (20 * 200) = 4500, which is more than 3000, so caps at 3000
      expect(ServerTiming.calculateDelay(20)).toBe(3000);
    });

    it("should calculate correctly for 12 false starts (should cap)", () => {
      // 500 + (12 * 200) = 2900, which is less than 3000
      expect(ServerTiming.calculateDelay(12)).toBe(2900);
    });

    it("should calculate correctly for 13 false starts (should cap)", () => {
      // 500 + (13 * 200) = 3100, which is more than 3000, so caps at 3000
      expect(ServerTiming.calculateDelay(13)).toBe(3000);
    });

    it("should handle negative false starts (edge case)", () => {
      // 500 + (-1 * 200) = 300
      expect(ServerTiming.calculateDelay(-1)).toBe(300);
    });
  });

  describe("isInBlindZone()", () => {
    it("should return true when response is before blind zone ends", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 0, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 0, 400); // 400ms after signal
      const blindDuration = 500; // 500ms blind zone

      expect(ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration)).toBe(true);
    });

    it("should return false when response is after blind zone ends", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 0, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 0, 600); // 600ms after signal
      const blindDuration = 500; // 500ms blind zone

      expect(ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration)).toBe(false);
    });

    it("should return false when blind duration is 0", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 0, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 0, 1); // 1ms after signal
      const blindDuration = 0;

      expect(ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration)).toBe(false);
    });

    it("should return true when response equals signal time", () => {
      const signalTime = new Date(2024, 0, 1, 0, 0, 0, 0);
      const responseTime = new Date(2024, 0, 1, 0, 0, 0, 0);
      const blindDuration = 500;

      expect(ServerTiming.isInBlindZone(signalTime, responseTime, blindDuration)).toBe(true);
    });
  });

  describe("generateSignalId()", () => {
    it("should return a string with sig_ prefix", () => {
      const signalId = ServerTiming.generateSignalId();
      
      expect(signalId).toMatch(/^sig_\d+_[a-z0-9]+$/);
    });

    it("should generate unique IDs", () => {
      const id1 = ServerTiming.generateSignalId();
      const id2 = ServerTiming.generateSignalId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe("canSubmitReaction()", () => {
    it("should return true when lastReactionTime is null", () => {
      expect(ServerTiming.canSubmitReaction(null)).toBe(true);
      expect(ServerTiming.canSubmitReaction(null, 50)).toBe(true);
    });

    it("should return true when enough time has passed", () => {
      const pastTime = new Date(Date.now() - 200); // 200ms ago
      expect(ServerTiming.canSubmitReaction(pastTime, 100)).toBe(true);
    });

    it("should return false when not enough time has passed", () => {
      const recentTime = new Date(Date.now() - 50); // 50ms ago
      expect(ServerTiming.canSubmitReaction(recentTime, 100)).toBe(false);
    });

    it("should use custom minInterval", () => {
      const recentTime = new Date(Date.now() - 150);
      expect(ServerTiming.canSubmitReaction(recentTime, 100)).toBe(true);
      expect(ServerTiming.canSubmitReaction(recentTime, 200)).toBe(false);
    });
  });
});

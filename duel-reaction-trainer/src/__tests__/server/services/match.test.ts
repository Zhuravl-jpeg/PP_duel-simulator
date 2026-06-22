import { MatchService } from "../../../../src/server/services/match";
import * as db from "../../../../src/server/db";
import * as schema from "../../../../src/server/db/schema";
import { eq, and, sql, asc, count } from "drizzle-orm";

// Моки для drizzle-orm
jest.mock("drizzle-orm", () => ({
  ...jest.requireActual("drizzle-orm"),
  eq: jest.fn(),
  and: jest.fn(),
  sql: jest.requireActual("drizzle-orm").sql,
  asc: jest.requireActual("drizzle-orm").asc,
  count: jest.requireActual("drizzle-orm").count,
}));

// Моки для db
jest.mock("../../../../src/server/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn((cb: any) => cb({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    })),
  },
}));

describe("MatchService", () => {
  describe("createMatch()", () => {
    it("should throw error for less than 2 participants", async () => {
      await expect(MatchService.createMatch(["user1"], 5)).rejects.toThrow(
        "Матч должен содержать от 2 до 5 игроков"
      );
    });

    it("should throw error for more than 5 participants", async () => {
      await expect(MatchService.createMatch(
        ["user1", "user2", "user3", "user4", "user5", "user6"],
        5
      )).rejects.toThrow(
        "Матч должен содержать от 2 до 5 игроков"
      );
    });

    it("should create match with valid participants", async () => {
      const mockMatch = {
        id: "match-123",
        status: "waiting",
        totalRounds: 5,
        currentRound: 1,
        createdAt: new Date(),
      };

      const mockParticipants = [
        { id: "p1", userId: "user1" },
        { id: "p2", userId: "user2" },
      ];

      const mockRounds = Array.from({ length: 5 }, (_, i) => ({
        id: `round-${i}`,
        roundNumber: i + 1,
      }));

      (db.db.insert as jest.Mock).mockImplementation(() => ({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockMatch]),
      }));

      (MatchService as any).getMatchDetails = jest.fn().mockResolvedValue({
        ...mockMatch,
        participants: mockParticipants,
        rounds: mockRounds,
      });

      const result = await MatchService.createMatch(["user1", "user2"], 5);
      
      expect(result).toEqual({
        ...mockMatch,
        participants: mockParticipants,
        rounds: mockRounds,
      });
    });
  });

  describe("joinMatch()", () => {
    it("should throw error when match not found", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        MatchService.joinMatch("nonexistent", "user1")
      ).rejects.toThrow("Матч не найден");
    });

    it("should throw error when match is not in waiting state", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ status: "active" }]),
      }));

      await expect(
        MatchService.joinMatch("match-123", "user1")
      ).rejects.toThrow("Матч уже начался или завершен");
    });

    it("should throw error when user already in match", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: "existing" }]),
      }));

      await expect(
        MatchService.joinMatch("match-123", "user1")
      ).rejects.toThrow("Вы уже в этом матче");
    });

    it("should throw error when match is full", async () => {
      (db.db.select as jest.Mock).mockImplementation((query: any) => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation((count: number) => {
          if (query.name === "count") {
            return Promise.resolve([{ count: 5 }]);
          }
          return Promise.resolve([{ status: "waiting" }]);
        }),
      }));

      await expect(
        MatchService.joinMatch("match-123", "user1")
      ).rejects.toThrow("Матч заполнен (макс. 5 игроков)");
    });
  });

  describe("startRound()", () => {
    it("should throw error when round not found", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        for: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        MatchService.startRound("nonexistent")
      ).rejects.toThrow("Раунд не найден");
    });

    it("should throw error when round is not in waiting state", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        for: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ status: "active" }]),
      }));

      await expect(
        MatchService.startRound("round-123")
      ).rejects.toThrow("Раунд уже запущен или завершен");
    });

    it("should start round and return signalTime", async () => {
      const mockRound = {
        id: "round-123",
        status: "waiting",
        matchId: "match-123",
        signalTime: null,
      };

      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        for: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockRound]),
      }));

      (db.db.update as jest.Mock).mockImplementation(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      }));

      const result = await MatchService.startRound("round-123");
      
      expect(result).toHaveProperty("signalTime");
      expect(result.status).toBe("active");
    });
  });

  describe("checkRoundCompletion()", () => {
    it("should return null when round is not active", async () => {
      (db.db.select as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ status: "finished" }]),
      }));

      const result = await MatchService.checkRoundCompletion("round-123");
      expect(result).toBeNull();
    });

    it("should return null when not all players have responded", async () => {
      (db.db.select as jest.Mock).mockImplementation((query: any) => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          if (query.table === "rounds") {
            return Promise.resolve([{ status: "active" }]);
          }
          if (query.table === "match_participants") {
            return Promise.resolve([{ id: "p1" }, { id: "p2" }]);
          }
          if (query.table === "round_results") {
            return Promise.resolve([{ participantId: "p1" }]);
          }
          return Promise.resolve([]);
        }),
      }));

      const result = await MatchService.checkRoundCompletion("round-123");
      expect(result).toBeNull();
    });
  });
});

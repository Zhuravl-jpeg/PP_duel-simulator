import { pgTable, text, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

/**
 * Таблица пользователей
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Таблица матчей (серий раундов)
 * Один матч = серия из N раундов между игроками
 */
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status", { enum: ["waiting", "active", "finished"] }).notNull().default("waiting"),
  totalRounds: integer("total_rounds").notNull().default(5),
  currentRound: integer("current_round").notNull().default(1),
});

/**
 * Таблица раундов
 * Каждый раунд принадлежит одному матчу
 */
export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .references(() => matches.id)
    .notNull(),
  roundNumber: integer("round_number").notNull(),
  signalTime: timestamp("signal_time"), // момент, когда сервер отправил сигнал
  status: text("status", { enum: ["waiting", "active", "finished"] }).notNull().default("waiting"),
});

/**
 * Таблица участников матча
 */
export const matchParticipants = pgTable("match_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .references(() => matches.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  score: integer("score").notNull().default(0),
  falseStarts: integer("false_starts").notNull().default(0),
  delaysApplied: integer("delays_applied").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

/**
 * Таблица результатов раунда
 */
export const roundResults = pgTable("round_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  roundId: uuid("round_id")
    .references(() => rounds.id)
    .notNull(),
  participantId: uuid("participant_id")
    .references(() => matchParticipants.id)
    .notNull(),
  reactionTime: integer("reaction_time"), // мс, null если фальстарт или не ответил
  isFalseStart: boolean("is_false_start").notNull().default(false),
  finishedAt: timestamp("finished_at"),
});

import { router } from "./trpc";
import { roundRouter } from "./routers/round";
import { matchRouter } from "./routers/match";
import { botRouter } from "./routers/bot";
import { leaderboardRouter } from "./routers/leaderboard";

/**
 * Корневой роутер — объединяет все роутеры
 */
export const appRouter = router({
  round: roundRouter,
  match: matchRouter,
  bot: botRouter,
  leaderboard: leaderboardRouter,
});

/**
 * Тип экспортируемого роутера (для type inference)
 */
export type AppRouter = typeof appRouter;

import { router } from "./trpc";
import { roundRouter } from "./routers/round";
import { matchRouter } from "./routers/match";

/**
 * Корневой роутер — объединяет все роутеры
 */
export const appRouter = router({
  round: roundRouter,
  match: matchRouter,
});

/**
 * Тип экспортируемого роутера (для type inference)
 */
export type AppRouter = typeof appRouter;

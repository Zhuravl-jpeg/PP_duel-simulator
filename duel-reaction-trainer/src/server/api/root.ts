import { router } from "./trpc";
import { roundRouter } from "./routers/round";

/**
 * Корневой роутер — объединяет все роутеры
 */
export const appRouter = router({
  round: roundRouter,
});

/**
 * Тип экспортируемого роутера (для type inference)
 */
export type AppRouter = typeof appRouter;

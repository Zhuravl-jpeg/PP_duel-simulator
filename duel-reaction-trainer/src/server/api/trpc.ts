import { initTRPC, TRPCError } from "@trpc/server";
import { type inferAsyncReturnType } from "@trpc/server";
import type * as express from "express";
import { reactionProtectionMiddleware } from "./middleware/protection";

/**
 * Инференс типа контекста tRPC
 */
export type CreateExpressContextOptions = {
  req: express.Request;
  res: express.Response;
};

/**
 * Создание контекста для tRPC
 */
export const createTRPCContext = (opts: CreateExpressContextOptions) => {
  return {
    ...opts,
  };
};

/**
 * Инстанс tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create();

/**
 * Middleware для логирования запросов
 */
const loggingMiddleware = t.middleware(({ next, path }) => {
  const start = Date.now();
  const result = next();
  const duration = Date.now() - start;
  console.log(`[tRPC] ${path} completed in ${duration}ms`);
  return result;
});

/**
 * Защищённый роутер (требует аутентификации)
 * Заглушка — будет использоваться после настройки Better-auth middleware
 */
export const protectedProcedure = t.procedure.use(({ next, ctx }) => {
  // TODO: Добавить проверку аутентификации через Better-auth
  // const session = await auth.api.getSession({ headers: ctx.req.headers });
  // if (!session) throw new Error("Unauthorized");
  return next({
    ctx: {
      ...ctx,
      // user: session.user,
    },
  });
});

/**
 * Открытый роутер (не требует аутентификации)
 * Применяет middleware защиты от манипуляций
 */
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(reactionProtectionMiddleware as any);

/**
 * Экспортируем корневой роутер
 */
export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

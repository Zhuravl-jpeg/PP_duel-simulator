import { initTRPC, TRPCError } from "@trpc/server";
import { type inferAsyncReturnType } from "@trpc/server";
import type * as express from "express";
import { reactionProtectionMiddleware } from "./middleware/protection";
import superjson from "superjson";

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
 * Инстанс tRPC с transformer
 */
const t = initTRPC.context<typeof createTRPCContext>()
  .create({
    transformer: superjson,
    errorFormatter: ({ shape, error }) => {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: error?.code,
          message: error?.message,
          cause: error?.cause?.message,
        },
      };
    },
  });

/**
 * Middleware для логирования запросов
 */
const loggingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  
  if (result.ok) {
    console.log(`[tRPC] ${path} completed in ${duration}ms`);
  } else {
    console.error(`[tRPC] ${path} failed in ${duration}ms:`, result.error);
  }
  
  return result;
});

/**
 * Middleware для обработки ошибок
 */
const errorHandlingMiddleware = t.middleware(async ({ next }) => {
  try {
    const result = await next();
    return result;
  } catch (err: any) {
    if (err instanceof TRPCError) {
      throw err;
    }
    
    // Преобразуем неизвестные ошибки в TRPCError
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message || "Внутренняя ошибка сервера",
      cause: err,
    });
  }
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
  .use(errorHandlingMiddleware)
  .use(loggingMiddleware)
  .use(reactionProtectionMiddleware as any);

/**
 * Экспортируем корневой роутер
 */
export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

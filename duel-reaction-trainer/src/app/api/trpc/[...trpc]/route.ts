import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import type { AppRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import type { CreateExpressContextOptions } from "@/server/api/trpc";
import { NextRequest } from "next/server";

/**
 * Обработчик tRPC-запросов
 * Маршрут: /api/trpc/[...trpc]
 */
const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (): CreateExpressContextOptions => ({
      req: req as any,
      res: {} as any,
    }),
    onError: ({ error, path }) => {
      console.error(`tRPC error on ${path}:`, error);
    },
  });

  return response;
};

export { handler as GET, handler as POST };

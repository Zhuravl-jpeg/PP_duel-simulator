import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../root";
import { createTRPCContext } from "../trpc";
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
    createContext: () => ({
      req,
      res: {} as any,
    }),
  });

  return response;
};

export { handler as GET, handler as POST };

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/root";
import superjson from "superjson";

/**
 * tRPC React-клиент
 * Использует createTRPCReact для type-safe запросов
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Клиент для прямых вызовов (fetch)
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
    }),
  ],
});

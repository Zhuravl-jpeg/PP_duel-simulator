import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/root";

/**
 * tRPC React-клиент
 * Использует createTRPCReact для type-safe запросов
 */
export const trpc = createTRPCReact<AppRouter>();

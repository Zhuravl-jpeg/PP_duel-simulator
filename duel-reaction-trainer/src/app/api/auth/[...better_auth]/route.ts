import { auth } from "@/server/auth/auth";
import { NextRequest } from "next/server";

/**
 * API-маршрут для Better-auth
 * Маршрут: /api/auth/[...better_auth]
 */
export const { GET, POST } = (req: NextRequest) => {
  return auth.handler(req);
};

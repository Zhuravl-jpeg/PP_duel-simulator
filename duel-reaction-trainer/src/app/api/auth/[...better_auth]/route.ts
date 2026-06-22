import { auth } from "@/server/auth/auth";
import { NextRequest } from "next/server";

/**
 * API-маршрут для Better-auth
 * Маршрут: /api/auth/[...better_auth]
 */
export async function GET(req: NextRequest) {
  return auth.handler(req);
}

export async function POST(req: NextRequest) {
  return auth.handler(req);
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  // URL для редиректа
  baseURL: process.env.BETTER_AUTH_URL,

  // Секрет
  secret: process.env.BETTER_AUTH_SECRET,
});

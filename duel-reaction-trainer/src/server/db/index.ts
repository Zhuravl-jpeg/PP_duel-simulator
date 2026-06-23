import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const poolMax = parseInt(process.env.DB_POOL_MAX ?? "1", 10);
const poolIdleTimeout = parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? "1000", 10);
const poolConnectionTimeout = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT ?? "2000", 10);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
  idleTimeoutMillis: poolIdleTimeout,
  connectionTimeoutMillis: poolConnectionTimeout,
});

// Graceful shutdown for serverless environments
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

export const db = drizzle(pool, { schema });

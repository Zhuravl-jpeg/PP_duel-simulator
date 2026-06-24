import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

// ─── Определение окружения ───
const isServerless =
  process.env.VERCEL === "1" ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  process.env.NOW_REGION !== undefined;

// ─── Настройка пула соединений ───
// В serverless-средах каждый инстанс изолирован, пул должен быть минимальным.
// Для локальной разработки используем переменные окружения или дефолтные значения.
const poolMax = isServerless
  ? 1
  : parseInt(process.env.DB_POOL_MAX ?? "5", 10);
const poolIdleTimeout = parseInt(
  process.env.DB_POOL_IDLE_TIMEOUT ?? "1000",
  10
);
const poolConnectionTimeout = parseInt(
  process.env.DB_POOL_CONNECTION_TIMEOUT ?? "2000",
  10
);

// Для Neon/Serverless рекомендуется использовать встроенный connection pooling
// или передавать параметры прямо в connectionString:
// postgresql://user:pass@host/db?sslmode=require&connection_limit=1
const connectionString = process.env.DATABASE_URL ?? "";
const hasServerlessPoolParams = connectionString.includes("connection_limit=");

const pool = new pg.Pool({
  connectionString: hasServerlessPoolParams
    ? connectionString
    : connectionString + (isServerless ? "?sslmode=require" : ""),
  max: hasServerlessPoolParams ? undefined : poolMax,
  idleTimeoutMillis: poolIdleTimeout,
  connectionTimeoutMillis: poolConnectionTimeout,
  // Безопасность для production/серверлесс
  ssl: isServerless ? { rejectUnauthorized: false } : undefined,
});

// Graceful shutdown для serverless и стандартных сред
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

export const db = drizzle(pool, { schema });

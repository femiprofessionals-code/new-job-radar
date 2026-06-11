/**
 * Database client.
 *
 * DEMO MODE (default): an embedded PostgreSQL (PGlite) persisted to `.data/pglite`,
 * migrated and seeded automatically on first boot. Real SQL, real transactions,
 * real row-level locking semantics — zero external services required.
 *
 * PRODUCTION: set DATABASE_URL (e.g. your Supabase connection string) and the
 * exact same Drizzle schema and queries run against managed Postgres.
 */
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import path from "path";
import fs from "fs";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

/**
 * Both drivers expose the same Drizzle query API; we type against one to keep
 * call sites free of union-overload noise.
 */
export type Database = PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __jobRadarDb?: Promise<Database>;
};

async function createDb(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    return drizzlePostgres(client, { schema }) as unknown as Database;
  }

  // Serverless platforms (Vercel/Lambda) only allow writes under /tmp. The
  // demo DB is ephemeral there (re-seeded per cold start), which is fine —
  // production should set DATABASE_URL.
  const writableRoot =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? path.join("/tmp", "jobradar")
      : path.join(process.cwd(), ".data");
  const dataDir = path.join(writableRoot, "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  const db = drizzlePglite(pglite, { schema });
  await migratePglite(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  await seedIfEmpty(db);
  return db;
}

export function getDb(): Promise<Database> {
  if (!globalForDb.__jobRadarDb) {
    globalForDb.__jobRadarDb = createDb();
  }
  return globalForDb.__jobRadarDb;
}

export * as tables from "./schema";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Used only by drizzle-kit CLI against a real database (e.g. Supabase).
    // Demo mode applies ./drizzle migrations to embedded PGlite automatically.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/jobradar",
  },
});

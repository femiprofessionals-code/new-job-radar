import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres (demo mode) and the postgres driver are native/runtime
  // packages that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Demo mode reads migration SQL and PGlite's WASM assets from disk at
  // runtime — make sure they ship inside serverless function bundles.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
};

export default nextConfig;

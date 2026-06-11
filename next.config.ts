import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres (demo mode) and the postgres driver are native/runtime
  // packages that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;

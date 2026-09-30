import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file — fall back to process env / defaults.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:xtra.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
});

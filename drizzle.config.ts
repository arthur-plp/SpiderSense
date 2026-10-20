import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load .env files by itself (Next.js does, at runtime).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});

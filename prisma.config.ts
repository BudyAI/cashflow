import { defineConfig } from "prisma/config";

const dbProvider = process.env["DB_PROVIDER"] ?? "sqlite";
const fallbackDatabaseUrl =
  dbProvider === "postgresql"
    ? "postgresql://localhost:5432/cashflow"
    : "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? fallbackDatabaseUrl,
  },
});

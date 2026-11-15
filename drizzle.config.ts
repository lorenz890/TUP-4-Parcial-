import { defineConfig } from "drizzle-kit";

// Misma regla que src/db/conexion.ts: Turso si están las dos variables,
// si no, el archivo local. drizzle-kit lee el .env solo.
const usaTurso = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN,
);

export default defineConfig({
  schema: "./src/db/esquema.ts",
  out: "./migraciones",
  dialect: usaTurso ? "turso" : "sqlite",
  dbCredentials: usaTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }
    : { url: process.env.BASE_LOCAL ?? "file:local.db" },
});

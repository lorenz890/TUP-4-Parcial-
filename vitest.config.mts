import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Las pruebas usan una base SQLite TEMPORAL, en la carpeta temporal del sistema: NUNCA
// local.db ni Turso. La crea y la migra pruebas/base-de-pruebas.ts antes de correr, y
// se borra al terminar.
const archivoDePrueba = join(tmpdir(), "gestion-comercial-pruebas", "pruebas.db").replaceAll("\\", "/");

export default defineConfig({
  resolve: {
    // Mismo alias "@/..." que usa el proyecto.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["pruebas/**/*.test.ts"],
    globalSetup: ["./pruebas/base-de-pruebas.ts"],
    setupFiles: ["./pruebas/seguridad.ts"],
    env: {
      // Variables vacías: aunque la terminal tenga las de Turso cargadas, conexion.ts
      // no las usa (necesita las dos con valor).
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      BASE_LOCAL: `file:${archivoDePrueba}`,
    },
    // Todos los archivos de prueba comparten la misma base temporal: de a uno por vez.
    fileParallelism: false,
  },
});

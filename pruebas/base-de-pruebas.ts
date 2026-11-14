import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { TestProject } from "vitest/node";

let carpeta = "";

// Antes de todas las pruebas: crea la base temporal (la ruta viene de vitest.config.mts) y
// le aplica las mismas migraciones que usa la aplicación, así las pruebas corren sobre el
// esquema real.
export async function setup(proyecto: TestProject) {
  const archivo = String(proyecto.config.env.BASE_LOCAL).replace(/^file:/, "");
  carpeta = dirname(archivo);

  // Esta carpeta se BORRA: solo se acepta si está dentro de la carpeta temporal del sistema.
  if (!carpeta.startsWith(tmpdir().replaceAll("\\", "/")) || archivo.includes("local.db")) {
    throw new Error(`Ruta de pruebas no permitida: ${archivo}`);
  }
  rmSync(carpeta, { recursive: true, force: true });
  mkdirSync(carpeta, { recursive: true });

  const cliente = createClient({ url: `file:${archivo}` });
  await migrate(drizzle(cliente), {
    migrationsFolder: fileURLToPath(new URL("../migraciones", import.meta.url)),
  });
  cliente.close();
}

// Después de todas las pruebas: borra la base temporal.
export function teardown() {
  try {
    rmSync(carpeta, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch {
    // En Windows el archivo puede seguir abierto un instante. No importa: la próxima
    // corrida lo borra al empezar (setup) y vive en la carpeta temporal del sistema.
  }
}

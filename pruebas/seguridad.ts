import { tmpdir } from "node:os";

// Se ejecuta antes de cada archivo de prueba, ANTES de que se cargue la conexión a la base.
// Es un freno de seguridad: si por cualquier motivo las pruebas fueran a apuntar a
// Turso o a local.db, se cortan acá sin tocar ningún dato.
const base = process.env.BASE_LOCAL ?? "";
const carpetaTemporal = tmpdir().replaceAll("\\", "/");

if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Las pruebas no pueden correr con las variables de Turso cargadas.");
}
if (!base.startsWith("file:") || !base.includes(carpetaTemporal) || base.includes("local.db")) {
  throw new Error(`Las pruebas solo pueden usar una base temporal. BASE_LOCAL=${base}`);
}

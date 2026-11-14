import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as esquema from "./esquema";

// ACÁ se decide qué base usar: si están las dos variables de Turso usamos la
// base remota (producción); si falta alguna, un archivo SQLite local (desarrollo).
// Se exige el par completo para no conectarse a Turso sin credenciales.
const usaTurso = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN,
);

const cliente = createClient(
  usaTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: "file:local.db" },
);

export const db = drizzle(cliente, { schema: esquema });

// Tipo de la transacción que recibe db.transaction(): las funciones que se llaman
// "dentro" de una transacción (como moverStock) lo piden para usar la misma.
export type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

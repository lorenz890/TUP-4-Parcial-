import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as esquema from "./esquema";

// ACÁ se decide qué base usar: si están las dos variables de Turso usamos la
// base remota (producción); si falta alguna, un archivo SQLite local (desarrollo).
// Se exige el par completo para no conectarse a Turso sin credenciales.
// BASE_LOCAL solo la usan las pruebas automáticas, para apuntar a un archivo temporal.
const usaTurso = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN,
);

const cliente = createClient(
  usaTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: process.env.BASE_LOCAL ?? "file:local.db" },
);

export const db = drizzle(cliente, { schema: esquema });

// Tipo de la transacción que recibe db.transaction(): las funciones que se llaman
// "dentro" de una transacción (como moverStock) lo piden para usar la misma.
export type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

// SQLite admite UN solo escritor por vez. En el modo local, las conexiones comparten el
// hilo de Node: si dos transacciones de escritura se superponen se bloquean entre sí
// ("database is locked"). Por eso las transacciones se hacen en fila: la siguiente
// empieza cuando termina la anterior. Todos los servicios abren sus transacciones con
// esta función y no con db.transaction().
let ultimaTransaccion: Promise<unknown> = Promise.resolve();

export function transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
  const resultado = ultimaTransaccion.then(() => db.transaction(trabajo));
  // Si una transacción falla, la siguiente igual tiene que poder empezar.
  ultimaTransaccion = resultado.catch(() => undefined);
  return resultado;
}

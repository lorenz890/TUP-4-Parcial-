import { eq, sql } from "drizzle-orm";
import { db } from "@/db/conexion";
import { clientes, movimientosCuenta, pagos, usuarios } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import { esquemaRegistrarPago } from "@/esquemas/pagos";
import { ApiError } from "@/lib/api-error";
import { PUNTO_DE_VENTA } from "@/lib/comercio";
import { formatearNumeroRecibo } from "@/lib/formatos";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { calcularSaldo } from "./clientes";

// RF-C5, reglas 4, 7, 8 y 11. Cualquier usuario puede registrar pagos (sección 3).
// Graba el pago con su número de recibo y el crédito en la cuenta corriente en UNA
// transacción: o se graban los dos o ninguno.
export async function registrarPago(usuario: UsuarioAutenticado, idClienteCrudo: unknown, entrada: unknown) {
  const clienteId = esquemaId.parse(idClienteCrudo);
  const datos = esquemaRegistrarPago.parse(entrada);

  const idPago = await db.transaction(async (tx) => {
    const [cliente] = await tx.select().from(clientes).where(eq(clientes.id, clienteId));
    if (!cliente) {
      throw new ApiError(404, "NO_ENCONTRADO", "El cliente no existe.");
    }
    if (!cliente.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "El cliente no tiene la cuenta corriente habilitada.",
      );
    }

    // REGLA 8: un pago no supera la deuda (no hay saldos a favor). El saldo se calcula
    // acá adentro, en la misma transacción: si entran dos pagos a la vez, el segundo
    // espera al primero y ve el saldo ya descontado.
    const saldo = await calcularSaldo(tx, clienteId);
    if (datos.importe > saldo) {
      throw new ApiError(422, "PAGO_SUPERA_DEUDA", "El pago es mayor que la deuda del cliente.", {
        saldo,
        importe: datos.importe,
      });
    }

    // REGLA 4: los recibos tienen su propia numeración, correlativa y sin huecos.
    // Dentro de la transacción no hay otro pago a la vez, así que "el último + 1" es seguro.
    const [{ ultimo }] = await tx
      .select({ ultimo: sql<number>`coalesce(max(${pagos.numero}), 0)` })
      .from(pagos)
      .where(eq(pagos.puntoVenta, PUNTO_DE_VENTA));
    const numero = ultimo + 1;

    const [pago] = await tx
      .insert(pagos)
      .values({
        clienteId,
        usuarioId: usuario.id, // regla 11: queda quién y cuándo
        puntoVenta: PUNTO_DE_VENTA,
        numero,
        importe: datos.importe,
        medio: datos.medio,
        observacion: datos.observacion || undefined,
      })
      .returning({ id: pagos.id });

    await tx.insert(movimientosCuenta).values({
      clienteId,
      pagoId: pago.id,
      tipo: "credito",
      importe: datos.importe,
      descripcion: `Recibo ${formatearNumeroRecibo(PUNTO_DE_VENTA, numero)}`,
    });

    return pago.id;
  });

  return leerRecibo(idPago);
}

// RF-C5: el mismo recibo, para reimprimirlo. Lo puede ver cualquier usuario.
export async function obtenerPago(usuario: UsuarioAutenticado, idCrudo: unknown) {
  const id = esquemaId.parse(idCrudo);
  return leerRecibo(id);
}

async function leerRecibo(id: number) {
  const [fila] = await db
    .select({
      id: pagos.id,
      puntoVenta: pagos.puntoVenta,
      numero: pagos.numero,
      fecha: pagos.fecha,
      importe: pagos.importe,
      medio: pagos.medio,
      observacion: pagos.observacion,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
    })
    .from(pagos)
    .innerJoin(clientes, eq(clientes.id, pagos.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, pagos.usuarioId))
    .where(eq(pagos.id, id));
  if (!fila) {
    throw new ApiError(404, "NO_ENCONTRADO", "El recibo no existe.");
  }

  // El saldo que quedó DESPUÉS de este pago: lo acumulado hasta su movimiento de cuenta.
  const [movimiento] = await db
    .select({ id: movimientosCuenta.id })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.pagoId, id));
  const saldo = await calcularSaldo(db, fila.clienteId, movimiento.id);

  return {
    id: fila.id,
    numeroRecibo: formatearNumeroRecibo(fila.puntoVenta, fila.numero),
    fecha: fila.fecha,
    cliente: { id: fila.clienteId, nombre: fila.clienteNombre },
    importe: fila.importe,
    medio: fila.medio,
    observacion: fila.observacion,
    usuario: { id: fila.usuarioId, nombre: fila.usuarioNombre },
    saldoCliente: saldo,
  };
}

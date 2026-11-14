import { and, count, desc, eq, like, lte, ne, or, sql } from "drizzle-orm";
import { db, type Transaccion } from "@/db/conexion";
import { clientes, facturas, movimientosCuenta } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import {
  esquemaConsultarCuenta,
  esquemaCrearCliente,
  esquemaEditarCliente,
  esquemaListarClientes,
} from "@/esquemas/clientes";
import { ApiError } from "@/lib/api-error";
import {
  formatearDocumento,
  formatearNumeroFactura,
  inicioDelDia,
  inicioDelDiaSiguiente,
} from "@/lib/formatos";
import type { UsuarioAutenticado } from "@/lib/permisos";

// REGLA 7 (sección 6): saldo del cliente = débitos − créditos de sus movimientos de
// cuenta. Es la ÚNICA definición del saldo: no se guarda en ninguna columna, así no
// puede quedar desfasado. Los débitos los graba la confirmación de una factura
// (etapa 8); los créditos, los pagos (etapa 7) y las anulaciones (etapa 8).
const sumaDeMovimientos = () =>
  sql<number>`sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end)`;

// Saldo de un solo cliente. Recibe `db` o una transacción: los pagos y las ventas lo
// calculan DENTRO de su transacción, para decidir con el saldo real. Con
// `hastaMovimientoId` da el saldo que había justo después de ese movimiento (lo usa el recibo).
export async function calcularSaldo(
  ejecutor: typeof db | Transaccion,
  clienteId: number,
  hastaMovimientoId?: number,
) {
  const [fila] = await ejecutor
    .select({ saldo: sql<number>`coalesce(${sumaDeMovimientos()}, 0)` })
    .from(movimientosCuenta)
    .where(
      and(
        eq(movimientosCuenta.clienteId, clienteId),
        hastaMovimientoId ? lte(movimientosCuenta.id, hastaMovimientoId) : undefined,
      ),
    );
  return fila.saldo;
}

// Saldo de todos los clientes a la vez, para los listados (una fila por cliente).
const saldos = db
  .select({ clienteId: movimientosCuenta.clienteId, saldo: sumaDeMovimientos().as("saldo") })
  .from(movimientosCuenta)
  .groupBy(movimientosCuenta.clienteId)
  .as("saldos");
const saldoDelListado = sql<number>`coalesce(${saldos.saldo}, 0)`;

type FilaCliente = typeof clientes.$inferSelect;

// Forma pública del cliente (sección 11.5). `saldo` y `disponible` se calculan.
function aCliente(fila: FilaCliente, saldo: number) {
  return {
    id: fila.id,
    tipoDoc: fila.tipoDoc,
    nroDoc: formatearDocumento(fila.tipoDoc, fila.nroDoc),
    nombre: fila.nombre,
    domicilio: fila.domicilio,
    telefono: fila.telefono,
    email: fila.email,
    cuentaCorriente: fila.cuentaCorriente,
    limiteCredito: fila.limiteCredito,
    saldo,
    disponible: fila.limiteCredito === null ? null : fila.limiteCredito - saldo,
    activo: fila.activo,
  };
}

async function leerCliente(id: number) {
  const [fila] = await db.select().from(clientes).where(eq(clientes.id, id));
  if (!fila) {
    throw new ApiError(404, "NO_ENCONTRADO", "El cliente no existe.");
  }
  return fila;
}

async function existeDocumento(tipoDoc: string, nroDoc: string, excluirId?: number) {
  const [fila] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      and(
        eq(clientes.tipoDoc, tipoDoc as FilaCliente["tipoDoc"]),
        eq(clientes.nroDoc, nroDoc),
        excluirId ? ne(clientes.id, excluirId) : undefined,
      ),
    );
  return fila !== undefined;
}

// RF-C1, RF-C6: listado paginado con el saldo de cada cliente, para cualquier usuario.
// Con `conDeuda` solo los que deben algo y se suma `totalAdeudado`.
export async function listarClientes(usuario: UsuarioAutenticado, entrada: unknown) {
  const { q, conDeuda, orden, activo = "true", page, pageSize } = esquemaListarClientes.parse(entrada);

  // El documento se busca sin puntos ni guiones: "28.456" encuentra al DNI 28456123.
  const digitos = q?.replace(/\D/g, "");
  const filtros = and(
    q
      ? or(like(clientes.nombre, `%${q}%`), digitos ? like(clientes.nroDoc, `%${digitos}%`) : undefined)
      : undefined,
    activo === "todos" ? undefined : eq(clientes.activo, activo === "true"),
    conDeuda ? sql`${saldoDelListado} > 0` : undefined,
  );

  const [{ total, totalAdeudado }] = await db
    .select({ total: count(), totalAdeudado: sql<number>`coalesce(sum(${saldoDelListado}), 0)` })
    .from(clientes)
    .leftJoin(saldos, eq(saldos.clienteId, clientes.id))
    .where(filtros);

  const filas = await db
    .select({ cliente: clientes, saldo: saldoDelListado })
    .from(clientes)
    .leftJoin(saldos, eq(saldos.clienteId, clientes.id))
    .where(filtros)
    .orderBy(...(orden === "saldo" ? [desc(saldoDelListado), clientes.nombre] : [clientes.nombre]))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data = filas.map(({ cliente, saldo }) => aCliente(cliente, saldo));
  return conDeuda ? { data, page, pageSize, total, totalAdeudado } : { data, page, pageSize, total };
}

// RF-C3: ficha del cliente con sus 6 últimas facturas, para cualquier usuario.
export async function obtenerCliente(usuario: UsuarioAutenticado, idCrudo: unknown) {
  const id = esquemaId.parse(idCrudo);
  const fila = await leerCliente(id);
  const saldo = await calcularSaldo(db, id);

  const ultimas = await db
    .select()
    .from(facturas)
    .where(eq(facturas.clienteId, id))
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(6);

  return {
    ...aCliente(fila, saldo),
    ultimasFacturas: ultimas.map((factura) => ({
      id: factura.id,
      numero: formatearNumeroFactura(factura.puntoVenta, factura.numero),
      fecha: factura.fecha,
      total: factura.total,
      formaPago: factura.formaPago,
      estado: factura.estado,
    })),
  };
}

// RF-C2, RF-V2: alta, para cualquier usuario (el vendedor también da de alta clientes).
export async function crearCliente(usuario: UsuarioAutenticado, entrada: unknown) {
  const datos = esquemaCrearCliente.parse(entrada);

  if (await existeDocumento(datos.tipoDoc, datos.nroDoc)) {
    throw new ApiError(409, "DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");
  }

  const [creado] = await db
    .insert(clientes)
    .values({
      tipoDoc: datos.tipoDoc,
      nroDoc: datos.nroDoc,
      nombre: datos.nombre,
      domicilio: datos.domicilio,
      telefono: datos.telefono,
      email: datos.email,
      cuentaCorriente: datos.cuentaCorriente,
      limiteCredito: datos.limiteCredito,
    })
    .returning();
  return aCliente(creado, 0); // un cliente nuevo todavía no tiene movimientos
}

// RF-C2, RF-C7, regla 12: edición y baja lógica, para cualquier usuario.
export async function editarCliente(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const datos = esquemaEditarCliente.parse(entrada);

  const actual = await leerCliente(id);
  const saldo = await calcularSaldo(db, id);

  if (datos.tipoDoc && datos.nroDoc && (await existeDocumento(datos.tipoDoc, datos.nroDoc, id))) {
    throw new ApiError(409, "DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");
  }

  // No se da de baja a un cliente, ni se le quita la cuenta corriente, mientras tenga saldo.
  const seDesactiva = datos.activo === false && actual.activo;
  const sePierdeCuenta = datos.cuentaCorriente === false && actual.cuentaCorriente;
  if ((seDesactiva || sePierdeCuenta) && saldo !== 0) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "El cliente tiene saldo en su cuenta corriente: tiene que quedar en cero antes.",
      { saldo },
    );
  }

  // Un PATCH vacío no cambia nada (y drizzle no admite un UPDATE sin campos).
  if (Object.keys(datos).length === 0) return aCliente(actual, saldo);

  const [editado] = await db.update(clientes).set(datos).where(eq(clientes.id, id)).returning();
  return aCliente(editado, saldo);
}

// RF-C4: movimientos de la cuenta en orden cronológico, con el saldo acumulado en cada
// renglón. Con `desde` el historial se corta y `saldoAnterior` trae lo acumulado hasta ese día.
export async function obtenerCuenta(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const { desde, hasta } = esquemaConsultarCuenta.parse(entrada);
  const cliente = await leerCliente(id);

  const todos = await db
    .select()
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, id))
    .orderBy(movimientosCuenta.fecha, movimientosCuenta.id);

  const inicio = desde ? inicioDelDia(desde) : null;
  const fin = hasta ? inicioDelDiaSiguiente(hasta) : null;

  let acumulado = 0;
  let saldoAnterior = 0;
  const movimientos = [];
  for (const movimiento of todos) {
    acumulado += movimiento.tipo === "debito" ? movimiento.importe : -movimiento.importe;

    if (inicio && movimiento.fecha < inicio) {
      saldoAnterior = acumulado;
      continue;
    }
    if (fin && movimiento.fecha >= fin) break;

    movimientos.push({
      fecha: movimiento.fecha,
      tipo: movimiento.tipo,
      importe: movimiento.importe,
      descripcion: movimiento.descripcion,
      facturaId: movimiento.facturaId,
      pagoId: movimiento.pagoId,
      saldo: acumulado,
    });
  }

  return {
    cliente: { id: cliente.id, nombre: cliente.nombre },
    saldoAnterior,
    movimientos,
    saldo: movimientos.length > 0 ? movimientos[movimientos.length - 1].saldo : saldoAnterior,
  };
}

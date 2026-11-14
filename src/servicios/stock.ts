import { and, count, desc, eq, gte, lt, type SQL, sql } from "drizzle-orm";
import { db, type Transaccion } from "@/db/conexion";
import { facturas, movimientosStock, productos, usuarios } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import { esquemaListarMovimientos, esquemaMovimientoManual } from "@/esquemas/stock";
import type { TIPOS_MOVIMIENTO_STOCK } from "@/esquemas/valores";
import { ApiError } from "@/lib/api-error";
import { formatearNumeroFactura, inicioDelDia, inicioDelDiaSiguiente } from "@/lib/formatos";
import { exigirAdmin, type UsuarioAutenticado } from "@/lib/permisos";

// REGLAS 1 y 2 (sección 6) y sección 10.2. Es la ÚNICA función del sistema que
// cambia la existencia de un producto. Ventas, anulaciones, ingresos y egresos la
// llaman; ninguna toca `productos.existencia` por su cuenta.
//
// Recibe la transacción abierta por quien la llama, así el cambio de existencia y el
// movimiento se graban juntos (o no se graba nada). `cantidad` lleva signo: negativa
// resta, positiva suma.
export async function moverStock(
  tx: Transaccion,
  datos: {
    productoId: number;
    usuarioId: number;
    tipo: (typeof TIPOS_MOVIMIENTO_STOCK)[number];
    cantidad: number;
    motivo: string;
    observacion?: string;
    facturaId?: number;
  },
) {
  // UPDATE condicionado: la base solo cambia la existencia si el resultado no queda
  // negativo. Como la comprobación y el cambio son UNA sola sentencia, dos ventas
  // simultáneas de la última unidad no pueden pasar las dos: la segunda no modifica
  // ninguna fila. (Es la forma de `WHERE existencia >= ?` para restas y para sumas.)
  const [actualizado] = await tx
    .update(productos)
    .set({ existencia: sql`${productos.existencia} + ${datos.cantidad}` })
    .where(
      and(
        eq(productos.id, datos.productoId),
        sql`${productos.existencia} + ${datos.cantidad} >= 0`,
      ),
    )
    .returning({ existencia: productos.existencia });

  // Si no se modificó ninguna fila hay dos causas posibles: el producto no existe o
  // no alcanza la existencia. Se mira cuál para responder con el error correcto.
  if (!actualizado) {
    const [producto] = await tx
      .select({ existencia: productos.existencia })
      .from(productos)
      .where(eq(productos.id, datos.productoId));
    if (!producto) {
      throw new ApiError(404, "NO_ENCONTRADO", "El producto no existe.");
    }
    throw new ApiError(409, "STOCK_INSUFICIENTE", `No hay existencia suficiente (disponible: ${producto.existencia}).`, [
      { productoId: datos.productoId, solicitado: -datos.cantidad, disponible: producto.existencia },
    ]);
  }

  // El movimiento se graba en la misma transacción, con la existencia que quedó.
  const [movimiento] = await tx
    .insert(movimientosStock)
    .values({
      productoId: datos.productoId,
      usuarioId: datos.usuarioId,
      facturaId: datos.facturaId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      existenciaResultante: actualizado.existencia,
      motivo: datos.motivo,
      observacion: datos.observacion || undefined,
    })
    .returning({ id: movimientosStock.id });
  return movimiento;
}

// RF-P4, RF-P5, regla 2: ingreso o egreso manual, solo admin.
export async function registrarMovimientoManual(
  usuario: UsuarioAutenticado,
  idCrudo: unknown,
  entrada: unknown,
) {
  const productoId = esquemaId.parse(idCrudo);
  const datos = esquemaMovimientoManual.parse(entrada);
  exigirAdmin(usuario);

  // El signo lo pone el servicio: el cliente siempre manda una cantidad positiva.
  const cantidad = datos.tipo === "ingreso" ? datos.cantidad : -datos.cantidad;

  const { id } = await db.transaction((tx) =>
    moverStock(tx, {
      productoId,
      usuarioId: usuario.id,
      tipo: datos.tipo,
      cantidad,
      motivo: datos.motivo,
      observacion: datos.observacion,
    }),
  );

  const [movimiento] = await consultarMovimientos(eq(movimientosStock.id, id), 1, 0);
  return movimiento;
}

// RF-P6: movimientos de todos los productos, o de uno solo con `productoId`,
// del más nuevo al más viejo. Lo puede ver cualquier usuario.
export async function listarMovimientos(usuario: UsuarioAutenticado, entrada: unknown) {
  const { productoId, tipo, desde, hasta, page, pageSize } = esquemaListarMovimientos.parse(entrada);

  if (productoId !== undefined) {
    const [existe] = await db.select({ id: productos.id }).from(productos).where(eq(productos.id, productoId));
    if (!existe) {
      throw new ApiError(404, "NO_ENCONTRADO", "El producto no existe.");
    }
  }

  const filtros = and(
    productoId ? eq(movimientosStock.productoId, productoId) : undefined,
    tipo ? eq(movimientosStock.tipo, tipo) : undefined,
    desde ? gte(movimientosStock.fecha, inicioDelDia(desde)) : undefined,
    hasta ? lt(movimientosStock.fecha, inicioDelDiaSiguiente(hasta)) : undefined,
  );

  const [{ total }] = await db.select({ total: count() }).from(movimientosStock).where(filtros);
  const data = await consultarMovimientos(filtros, pageSize, (page - 1) * pageSize);
  return { data, page, pageSize, total };
}

// Arma los movimientos con la forma pública de la sección 11.4.
async function consultarMovimientos(filtros: SQL | undefined, limite: number, desplazamiento: number) {
  const filas = await db
    .select({
      id: movimientosStock.id,
      productoId: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      facturaId: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numeroFactura: facturas.numero,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
      fecha: movimientosStock.fecha,
    })
    .from(movimientosStock)
    .innerJoin(productos, eq(productos.id, movimientosStock.productoId))
    .innerJoin(usuarios, eq(usuarios.id, movimientosStock.usuarioId))
    .leftJoin(facturas, eq(facturas.id, movimientosStock.facturaId))
    .where(filtros)
    .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
    .limit(limite)
    .offset(desplazamiento);

  return filas.map((fila) => ({
    id: fila.id,
    producto: { id: fila.productoId, codigo: fila.codigo, descripcion: fila.descripcion },
    tipo: fila.tipo,
    cantidad: fila.cantidad,
    existenciaResultante: fila.existenciaResultante,
    motivo: fila.motivo,
    observacion: fila.observacion,
    // Solo las ventas y las anulaciones tienen factura de origen.
    referencia:
      fila.facturaId === null
        ? null
        : {
            facturaId: fila.facturaId,
            numero: formatearNumeroFactura(fila.puntoVenta!, fila.numeroFactura!),
          },
    usuario: { id: fila.usuarioId, nombre: fila.usuarioNombre },
    fecha: fila.fecha,
  }));
}

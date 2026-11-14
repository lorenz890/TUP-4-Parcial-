import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/conexion";
import { facturaItems, facturas, productos } from "@/db/esquema";
import { FORMAS_DE_PAGO } from "@/esquemas/valores";
import { hoyEnArgentina, inicioDelDia, inicioDelDiaSiguiente, sumarDias } from "@/lib/formatos";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { listarClientes } from "./clientes";
import { listarProductos } from "./productos";

// RF-T1, RF-T2, RF-T3: todo lo que muestra la pantalla de inicio, en una sola respuesta
// (sección 11.7). Lo ven los dos roles. Solo cuenta las facturas EMITIDAS (las anuladas no
// suman), y el día y el mes se calculan en hora de Argentina.
export async function obtenerTablero(usuario: UsuarioAutenticado) {
  const hoy = hoyEnArgentina();
  const primeroDelMes = `${hoy.slice(0, 8)}01`;
  const hace29Dias = sumarDias(hoy, -29); // 30 días contando hoy
  const hasta = inicioDelDiaSiguiente(hoy); // el rango termina al empezar mañana

  const emitidas = eq(facturas.estado, "emitida");
  const desde = (dia: string) => and(emitidas, gte(facturas.fecha, inicioDelDia(dia)), lt(facturas.fecha, hasta));

  // Cantidad e importe de las facturas de un período.
  const resumen = async (dia: string) => {
    const [fila] = await db
      .select({ cantidad: sql<number>`count(*)`, importe: sql<number>`coalesce(sum(${facturas.total}), 0)` })
      .from(facturas)
      .where(desde(dia));
    return fila;
  };
  const delDia = await resumen(hoy);
  const delMes = await resumen(primeroDelMes);

  // Ventas por día. Argentina está tres horas atrás de UTC y no cambia de horario:
  // restar 3 horas a la fecha guardada da el día argentino en que se hizo la venta.
  const porDia = await db
    .select({ dia: sql<string>`date(${facturas.fecha}, '-3 hours')`, importe: sql<number>`sum(${facturas.total})` })
    .from(facturas)
    .where(desde(hace29Dias))
    .groupBy(sql`date(${facturas.fecha}, '-3 hours')`);

  // Siempre 30 elementos, del más viejo a hoy, con 0 en los días sin ventas: así el
  // gráfico no tiene huecos.
  const ventasDiarias = Array.from({ length: 30 }, (_, posicion) => {
    const dia = sumarDias(hace29Dias, posicion);
    return { fecha: dia, importe: porDia.find((fila) => fila.dia === dia)?.importe ?? 0 };
  });

  // Ventas del mes por forma de pago (las tres formas, aunque alguna esté en 0).
  const porForma = await db
    .select({ forma: facturas.formaPago, importe: sql<number>`sum(${facturas.total})` })
    .from(facturas)
    .where(desde(primeroDelMes))
    .groupBy(facturas.formaPago);
  const porFormaDePago = FORMAS_DE_PAGO.map((forma) => ({
    forma,
    importe: porForma.find((fila) => fila.forma === forma)?.importe ?? 0,
  }));

  // Los 5 productos más vendidos del mes, por cantidad de unidades.
  const masVendidos = await db
    .select({
      productoId: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      unidades: sql<number>`sum(${facturaItems.cantidad})`,
      importe: sql<number>`sum(${facturaItems.subtotal})`,
    })
    .from(facturaItems)
    .innerJoin(facturas, eq(facturas.id, facturaItems.facturaId))
    .innerJoin(productos, eq(productos.id, facturaItems.productoId))
    .where(desde(primeroDelMes))
    .groupBy(productos.id)
    .orderBy(desc(sql`sum(${facturaItems.cantidad})`), productos.codigo)
    .limit(5);

  // La deuda y los productos bajo el mínimo salen de los mismos servicios que usan sus
  // pantallas: así el saldo y "bajo mínimo" se definen en un solo lugar.
  const deudores = await listarClientes(usuario, { conDeuda: "true", pageSize: 1 });
  const bajoMinimo = await listarProductos(usuario, { bajoMinimo: "true", pageSize: 1 });

  return {
    hoy: delDia,
    mes: {
      ...delMes,
      ticketPromedio: delMes.cantidad > 0 ? Math.round(delMes.importe / delMes.cantidad) : 0,
    },
    cuentasCorrientes: { totalAdeudado: deudores.totalAdeudado ?? 0, clientesConSaldo: deudores.total },
    bajoMinimo: { cantidad: bajoMinimo.total },
    ventasDiarias,
    porFormaDePago,
    masVendidos,
  };
}

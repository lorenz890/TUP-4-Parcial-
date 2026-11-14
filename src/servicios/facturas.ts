import { and, count, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import { db, transaccion } from "@/db/conexion";
import {
  clientes,
  facturaItems,
  facturas,
  movimientosCuenta,
  productos,
  usuarios,
} from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import {
  esquemaAnularFactura,
  esquemaCrearFactura,
  esquemaListarFacturas,
} from "@/esquemas/facturas";
import { ApiError } from "@/lib/api-error";
import { PUNTO_DE_VENTA } from "@/lib/comercio";
import {
  formatearDocumento,
  formatearNumeroFactura,
  inicioDelDia,
  inicioDelDiaSiguiente,
} from "@/lib/formatos";
import { exigirAdmin, type UsuarioAutenticado } from "@/lib/permisos";
import { calcularSaldo } from "./clientes";
import { moverStock } from "./stock";

// RF-V1 a RF-V6, reglas 1 a 6 y 9 a 11. Cualquier usuario puede facturar (sección 3).
//
// La confirmación es UNA sola transacción: o se graban la factura, sus renglones, los
// movimientos de stock y el débito de la cuenta corriente, o no se graba nada. Sigue los
// 9 pasos de la sección 11.6, en ese orden. Los pasos 1 a 5 solo LEEN y validan: si algo
// falla ahí no se escribió nada. Recién en los pasos 6 a 9 se escribe.
export async function confirmarFactura(usuario: UsuarioAutenticado, entrada: unknown) {
  const datos = esquemaCrearFactura.parse(entrada);

  const idFactura = await transaccion(async (tx) => {
    // PASO 1. Los productos existen y están activos.
    const filas = await tx
      .select()
      .from(productos)
      .where(inArray(productos.id, datos.items.map((item) => item.productoId)));
    const productoPorId = new Map(filas.map((fila) => [fila.id, fila]));

    for (const item of datos.items) {
      const producto = productoPorId.get(item.productoId);
      if (!producto) {
        throw new ApiError(404, "NO_ENCONTRADO", `El producto ${item.productoId} no existe.`);
      }
      if (!producto.activo) {
        throw new ApiError(422, "PRODUCTO_INACTIVO", `${producto.descripcion} está dado de baja.`, [
          { productoId: producto.id, codigo: producto.codigo },
        ]);
      }
    }

    // PASO 2. El cliente (si hay) está activo; y si el pago es a cuenta, la tiene habilitada.
    // REGLA 6: consumidor final no compra en cuenta corriente.
    let cliente = null;
    if (datos.clienteId) {
      [cliente] = await tx.select().from(clientes).where(eq(clientes.id, datos.clienteId));
      if (!cliente) {
        throw new ApiError(404, "NO_ENCONTRADO", "El cliente no existe.");
      }
      if (!cliente.activo) {
        throw new ApiError(422, "VALIDACION", "Hay campos con errores.", [
          { campo: "clienteId", mensaje: "El cliente está dado de baja." },
        ]);
      }
    }
    if (datos.pago.forma === "cuenta_corriente" && !cliente?.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "Para vender a cuenta corriente hace falta un cliente registrado y habilitado.",
      );
    }

    // PASO 3. REGLA 1: la existencia alcanza para cada renglón. Se listan TODOS los que no
    // alcanzan, para que la pantalla los marque juntos. (Esto es una revisión previa: la
    // garantía real contra ventas simultáneas es el UPDATE condicionado de moverStock, en el paso 8.)
    const faltantes = datos.items
      .filter((item) => productoPorId.get(item.productoId)!.existencia < item.cantidad)
      .map((item) => ({
        productoId: item.productoId,
        solicitado: item.cantidad,
        disponible: productoPorId.get(item.productoId)!.existencia,
      }));
    if (faltantes.length > 0) {
      throw new ApiError(409, "STOCK_INSUFICIENTE", "No hay existencia suficiente.", faltantes);
    }

    // PASO 4. REGLA 3: el precio sale del catálogo, en el servidor. Lo que mande el cliente
    // no cuenta (el esquema ni siquiera admite un campo de precio).
    const renglones = datos.items.map((item) => {
      const producto = productoPorId.get(item.productoId)!;
      return {
        productoId: producto.id,
        descripcion: producto.descripcion, // se COPIA: si cambia el catálogo, la factura no
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
        subtotal: producto.precio * item.cantidad,
      };
    });
    const total = renglones.reduce((suma, renglon) => suma + renglon.subtotal, 0);

    // PASO 5. La forma de pago es viable.
    let montoRecibido: number | null = null;
    if (datos.pago.forma === "contado") {
      montoRecibido = datos.pago.montoRecibido ?? total;
      if (montoRecibido < total) {
        throw new ApiError(422, "MONTO_INSUFICIENTE", "El monto recibido no cubre el total.", {
          total,
          montoRecibido,
        });
      }
    }
    if (datos.pago.forma === "cuenta_corriente" && cliente) {
      // REGLA 7: el saldo se calcula acá adentro, en la misma transacción, con los
      // movimientos reales, y una venta a cuenta no puede pasar el límite de crédito.
      const saldoActual = await calcularSaldo(tx, cliente.id);
      const saldoNuevo = saldoActual + total;
      if (cliente.limiteCredito !== null && saldoNuevo > cliente.limiteCredito) {
        throw new ApiError(
          422,
          "LIMITE_CREDITO_EXCEDIDO",
          "La venta supera el límite de crédito del cliente.",
          { saldoActual, limite: cliente.limiteCredito, excedente: saldoNuevo - cliente.limiteCredito },
        );
      }
    }

    // PASO 6. REGLA 4: el número se asigna AHORA, al confirmar, no al empezar la venta.
    // Como la transacción es exclusiva para escribir, no hay otra confirmación a la vez:
    // "el último + 1" no deja huecos ni repite. Si algo falla más abajo, todo se deshace
    // y el número queda libre para la próxima.
    const [{ ultimo }] = await tx
      .select({ ultimo: sql<number>`coalesce(max(${facturas.numero}), 0)` })
      .from(facturas)
      .where(eq(facturas.puntoVenta, PUNTO_DE_VENTA));
    const numero = ultimo + 1;

    // PASO 7. Se graban la factura y sus renglones. REGLA 9: de la tarjeta solo
    // tipo, marca y últimos 4 dígitos. REGLA 11: queda el vendedor y la fecha.
    const [factura] = await tx
      .insert(facturas)
      .values({
        puntoVenta: PUNTO_DE_VENTA,
        numero,
        clienteId: cliente?.id,
        usuarioId: usuario.id,
        total,
        formaPago: datos.pago.forma,
        tarjetaTipo: datos.pago.forma === "tarjeta" ? datos.pago.tarjeta.tipo : undefined,
        tarjetaMarca: datos.pago.forma === "tarjeta" ? datos.pago.tarjeta.marca : undefined,
        tarjetaUltimos4: datos.pago.forma === "tarjeta" ? datos.pago.tarjeta.ultimos4 : undefined,
        montoRecibido: montoRecibido ?? undefined,
      })
      .returning({ id: facturas.id });

    await tx
      .insert(facturaItems)
      .values(renglones.map((renglon) => ({ facturaId: factura.id, ...renglon })));

    // PASO 8. REGLAS 1 y 2: se descuenta la existencia con moverStock(), que graba el
    // movimiento en esta misma transacción. Si dos ventas compiten por la última unidad,
    // acá una de las dos recibe STOCK_INSUFICIENTE y se deshace todo lo anterior.
    for (const renglon of renglones) {
      await moverStock(tx, {
        productoId: renglon.productoId,
        usuarioId: usuario.id,
        tipo: "venta",
        cantidad: -renglon.cantidad,
        motivo: "Venta",
        facturaId: factura.id,
      });
    }

    // PASO 9. REGLA 7: si es a cuenta corriente, el débito en la cuenta del cliente.
    if (datos.pago.forma === "cuenta_corriente" && cliente) {
      await tx.insert(movimientosCuenta).values({
        clienteId: cliente.id,
        facturaId: factura.id,
        tipo: "debito",
        importe: total,
        descripcion: `Factura ${formatearNumeroFactura(PUNTO_DE_VENTA, numero)}`,
      });
    }

    return factura.id;
  });

  return leerFactura(idFactura);
}

// RF-V9, reglas 2, 5 y 7: la anulación hace lo inverso de la confirmación, en una sola
// transacción. Solo el administrador, y con motivo obligatorio. La factura NO se borra:
// queda visible con estado "anulada".
export async function anularFactura(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const { motivo } = esquemaAnularFactura.parse(entrada);
  exigirAdmin(usuario);

  await transaccion(async (tx) => {
    // El estado cambia con un UPDATE condicionado (solo si sigue "emitida"): si dos
    // administradores anulan la misma factura a la vez, solo uno la encuentra emitida.
    const [anulada] = await tx
      .update(facturas)
      .set({
        estado: "anulada",
        motivoAnulacion: motivo,
        anuladaEn: sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`,
        anuladaPorId: usuario.id, // regla 11
      })
      .where(and(eq(facturas.id, id), eq(facturas.estado, "emitida")))
      .returning();

    if (!anulada) {
      const [existente] = await tx.select({ id: facturas.id }).from(facturas).where(eq(facturas.id, id));
      if (!existente) {
        throw new ApiError(404, "NO_ENCONTRADO", "La factura no existe.");
      }
      throw new ApiError(409, "FACTURA_ANULADA", "La factura ya estaba anulada.");
    }

    // Se reingresa la existencia de cada renglón, con un movimiento de anulación.
    const renglones = await tx.select().from(facturaItems).where(eq(facturaItems.facturaId, id));
    for (const renglon of renglones) {
      await moverStock(tx, {
        productoId: renglon.productoId,
        usuarioId: usuario.id,
        tipo: "anulacion",
        cantidad: renglon.cantidad,
        motivo: "Anulación de factura",
        observacion: motivo,
        facturaId: id,
      });
    }

    // Si fue a cuenta corriente, un crédito por el total deja el saldo como estaba.
    if (anulada.formaPago === "cuenta_corriente" && anulada.clienteId) {
      await tx.insert(movimientosCuenta).values({
        clienteId: anulada.clienteId,
        facturaId: id,
        tipo: "credito",
        importe: anulada.total,
        descripcion: `Anulación factura ${formatearNumeroFactura(anulada.puntoVenta, anulada.numero)}`,
      });
    }
  });

  return leerFactura(id);
}

// RF-V7: una factura completa, para cualquier usuario.
export async function obtenerFactura(usuario: UsuarioAutenticado, idCrudo: unknown) {
  const id = esquemaId.parse(idCrudo);
  return leerFactura(id);
}

// RF-V1: el número que va a tener la próxima factura. Es solo informativo: el número
// real se asigna al confirmar (regla 4).
export async function proximoNumero() {
  const [{ ultimo }] = await db
    .select({ ultimo: sql<number>`coalesce(max(${facturas.numero}), 0)` })
    .from(facturas)
    .where(eq(facturas.puntoVenta, PUNTO_DE_VENTA));
  return { numeroFormateado: formatearNumeroFactura(PUNTO_DE_VENTA, ultimo + 1) };
}

// RF-V8: listado paginado con filtros, de la más nueva a la más vieja, sin renglones.
// Agrega `totalEmitido`: la suma de las emitidas que cumplen los filtros.
export async function listarFacturas(usuario: UsuarioAutenticado, entrada: unknown) {
  const { q, desde, hasta, clienteId, vendedorId, forma, estado, page, pageSize } =
    esquemaListarFacturas.parse(entrada);

  // `q` busca por número ("0001-00001233" o solo "1233") o por nombre del cliente.
  const numeroBuscado = q && /^(\d{1,4}-)?\d+$/.test(q) ? Number(q.split("-").pop()) : null;
  const filtros = and(
    q
      ? or(
          like(clientes.nombre, `%${q}%`),
          numeroBuscado !== null ? eq(facturas.numero, numeroBuscado) : undefined,
        )
      : undefined,
    desde ? gte(facturas.fecha, inicioDelDia(desde)) : undefined,
    hasta ? lt(facturas.fecha, inicioDelDiaSiguiente(hasta)) : undefined,
    clienteId ? eq(facturas.clienteId, clienteId) : undefined,
    vendedorId ? eq(facturas.usuarioId, vendedorId) : undefined,
    forma ? eq(facturas.formaPago, forma) : undefined,
    estado ? eq(facturas.estado, estado) : undefined,
  );

  const [{ total, totalEmitido }] = await db
    .select({
      total: count(),
      totalEmitido: sql<number>`coalesce(sum(case when ${facturas.estado} = 'emitida' then ${facturas.total} else 0 end), 0)`,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .where(filtros);

  const filas = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      estado: facturas.estado,
      formaPago: facturas.formaPago,
      total: facturas.total,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      vendedorId: usuarios.id,
      vendedorNombre: usuarios.nombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .where(filtros)
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data = filas.map((fila) => ({
    id: fila.id,
    numeroFormateado: formatearNumeroFactura(fila.puntoVenta, fila.numero),
    fecha: fila.fecha,
    estado: fila.estado,
    formaPago: fila.formaPago,
    total: fila.total,
    cliente: fila.clienteId === null ? null : { id: fila.clienteId, nombre: fila.clienteNombre! },
    vendedor: { id: fila.vendedorId, nombre: fila.vendedorNombre },
  }));

  return { data, page, pageSize, total, totalEmitido };
}

// Arma la factura completa con la forma pública de la sección 11.6. La usan la
// confirmación, la anulación y la consulta, para que las tres respondan lo mismo.
async function leerFactura(id: number) {
  const [fila] = await db
    .select({
      factura: facturas,
      cliente: clientes,
      vendedorNombre: usuarios.nombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .where(eq(facturas.id, id));
  if (!fila) {
    throw new ApiError(404, "NO_ENCONTRADO", "La factura no existe.");
  }
  const { factura, cliente } = fila;

  const renglones = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: productos.codigo,
      descripcion: facturaItems.descripcion,
      cantidad: facturaItems.cantidad,
      precioUnitario: facturaItems.precioUnitario,
      subtotal: facturaItems.subtotal,
    })
    .from(facturaItems)
    .innerJoin(productos, eq(productos.id, facturaItems.productoId))
    .where(eq(facturaItems.facturaId, id))
    .orderBy(facturaItems.id);

  // Datos de pago según la forma. De la tarjeta, solo tipo, marca y últimos 4 (regla 9).
  const pago =
    factura.formaPago === "contado"
      ? {
          forma: "contado" as const,
          montoRecibido: factura.montoRecibido!,
          vuelto: factura.montoRecibido! - factura.total,
        }
      : factura.formaPago === "tarjeta"
        ? {
            forma: "tarjeta" as const,
            tarjeta: {
              tipo: factura.tarjetaTipo!,
              marca: factura.tarjetaMarca!,
              ultimos4: factura.tarjetaUltimos4!,
            },
          }
        : { forma: "cuenta_corriente" as const };

  // En una venta a cuenta se informa el saldo que quedó justo después de su débito.
  let saldoCliente: number | undefined;
  if (factura.formaPago === "cuenta_corriente" && factura.clienteId) {
    const [debito] = await db
      .select({ id: movimientosCuenta.id })
      .from(movimientosCuenta)
      .where(and(eq(movimientosCuenta.facturaId, id), eq(movimientosCuenta.tipo, "debito")));
    saldoCliente = await calcularSaldo(db, factura.clienteId, debito.id);
  }

  // Si está anulada, se suma quién, cuándo y por qué.
  let anulacion;
  if (factura.estado === "anulada" && factura.anuladaPorId) {
    const [anulador] = await db
      .select({ nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, factura.anuladaPorId));
    anulacion = {
      fecha: factura.anuladaEn!,
      usuario: { id: factura.anuladaPorId, nombre: anulador.nombre },
      motivo: factura.motivoAnulacion!,
    };
  }

  return {
    id: factura.id,
    puntoVenta: factura.puntoVenta,
    numero: factura.numero,
    numeroFormateado: formatearNumeroFactura(factura.puntoVenta, factura.numero),
    fecha: factura.fecha,
    estado: factura.estado,
    cliente: cliente
      ? {
          id: cliente.id,
          nombre: cliente.nombre,
          tipoDoc: cliente.tipoDoc,
          nroDoc: formatearDocumento(cliente.tipoDoc, cliente.nroDoc),
          domicilio: cliente.domicilio,
        }
      : null,
    vendedor: { id: factura.usuarioId, nombre: fila.vendedorNombre },
    items: renglones,
    total: factura.total,
    pago,
    ...(saldoCliente !== undefined && { saldoCliente }),
    ...(anulacion && { anulacion }),
  };
}

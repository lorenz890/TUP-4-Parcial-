// Las 9 tablas de la sección 7. Reglas que se repiten en todas:
// - Los importes son enteros en CENTAVOS (regla 10): nunca decimales.
// - Las fechas son texto ISO 8601 en UTC, como las devuelve la API (sección 11.1).
// - Nada se borra: usuarios, productos y clientes llevan `activo` (regla 12).
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  ESTADOS_FACTURA,
  FORMAS_DE_PAGO,
  MEDIOS_DE_PAGO,
  ROLES,
  TIPOS_DOCUMENTO,
  TIPOS_MOVIMIENTO_CUENTA,
  TIPOS_MOVIMIENTO_STOCK,
  TIPOS_TARJETA,
} from "../esquemas/valores";


// Fecha de creación: la completa la base al insertar, así ninguna tabla la olvida.
// Es una función (y no una constante) porque cada tabla necesita su propia columna.
const fechaActual = (nombre: string) =>
  text(nombre)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`);

export const usuarios = sqliteTable("usuarios", {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  nombre: text().notNull(),
  hashContrasena: text("hash_contrasena").notNull(), // bcrypt, nunca la contraseña
  rol: text({ enum: ROLES }).notNull(),
  activo: integer({ mode: "boolean" }).notNull().default(true),
  creadoEn: fechaActual("creado_en"),
});

export const categorias = sqliteTable("categorias", {
  id: integer().primaryKey({ autoIncrement: true }),
  nombre: text().notNull().unique(),
  activa: integer({ mode: "boolean" }).notNull().default(true),
  creadoEn: fechaActual("creado_en"),
});

export const productos = sqliteTable(
  "productos",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    codigo: text().notNull().unique(),
    descripcion: text().notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    precio: integer().notNull(), // centavos
    // Solo la cambia moverStock() (sección 10.2). El CHECK es la última red de
    // seguridad: aunque un servicio fallara, la base rechaza una existencia negativa.
    existencia: integer().notNull().default(0),
    stockMinimo: integer("stock_minimo").notNull().default(0),
    activo: integer({ mode: "boolean" }).notNull().default(true),
    creadoEn: fechaActual("creado_en"),
  },
  (tabla) => [check("existencia_no_negativa", sql`${tabla.existencia} >= 0`)],
);

export const clientes = sqliteTable(
  "clientes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tipoDoc: text("tipo_doc", { enum: TIPOS_DOCUMENTO }).notNull(),
    nroDoc: text("nro_doc").notNull(), // solo dígitos: el punto y el guion son formato
    nombre: text().notNull(),
    domicilio: text(),
    telefono: text(),
    email: text(),
    cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" }).notNull().default(false),
    limiteCredito: integer("limite_credito"), // centavos; nulo = sin límite
    activo: integer({ mode: "boolean" }).notNull().default(true),
    creadoEn: fechaActual("creado_en"),
  },
  (tabla) => [uniqueIndex("clientes_documento").on(tabla.tipoDoc, tabla.nroDoc)],
);

export const facturas = sqliteTable(
  "facturas",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    puntoVenta: integer("punto_venta").notNull().default(1),
    numero: integer().notNull(), // se asigna al confirmar, correlativo y sin huecos
    fecha: fechaActual("fecha"),
    clienteId: integer("cliente_id").references(() => clientes.id), // nulo = consumidor final
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id), // el vendedor
    total: integer().notNull(), // centavos
    formaPago: text("forma_pago", { enum: FORMAS_DE_PAGO }).notNull(),
    // Regla 9: de la tarjeta solo tipo, marca y últimos 4 dígitos.
    tarjetaTipo: text("tarjeta_tipo", { enum: TIPOS_TARJETA }),
    tarjetaMarca: text("tarjeta_marca"),
    tarjetaUltimos4: text("tarjeta_ultimos4"),
    montoRecibido: integer("monto_recibido"), // centavos; solo contado
    estado: text({ enum: ESTADOS_FACTURA }).notNull().default("emitida"),
    // Datos de la anulación (los pide la respuesta de la sección 11.6).
    motivoAnulacion: text("motivo_anulacion"),
    anuladaEn: text("anulada_en"),
    anuladaPorId: integer("anulada_por_id").references(() => usuarios.id),
  },
  (tabla) => [
    // Garantiza que nunca haya dos facturas con el mismo número.
    uniqueIndex("facturas_numero").on(tabla.puntoVenta, tabla.numero),
    index("facturas_fecha").on(tabla.fecha),
    index("facturas_cliente").on(tabla.clienteId),
  ],
);

export const facturaItems = sqliteTable(
  "factura_items",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    facturaId: integer("factura_id")
      .notNull()
      .references(() => facturas.id),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    // Regla 3: descripción y precio se COPIAN del catálogo al facturar.
    descripcion: text().notNull(),
    cantidad: integer().notNull(),
    precioUnitario: integer("precio_unitario").notNull(), // centavos
    subtotal: integer().notNull(), // centavos
    creadoEn: fechaActual("creado_en"),
  },
  // La API no admite el mismo producto dos veces en una factura.
  (tabla) => [uniqueIndex("factura_items_producto").on(tabla.facturaId, tabla.productoId)],
);

export const movimientosStock = sqliteTable(
  "movimientos_stock",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    facturaId: integer("factura_id").references(() => facturas.id), // solo venta y anulación
    tipo: text({ enum: TIPOS_MOVIMIENTO_STOCK }).notNull(),
    cantidad: integer().notNull(), // con signo: negativa si baja la existencia
    existenciaResultante: integer("existencia_resultante").notNull(),
    motivo: text().notNull(),
    observacion: text(),
    fecha: fechaActual("fecha"),
  },
  // La ficha del producto lista sus movimientos del más nuevo al más viejo.
  (tabla) => [index("movimientos_stock_producto").on(tabla.productoId, tabla.fecha)],
);

export const pagos = sqliteTable(
  "pagos",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    // Los recibos tienen su propia numeración (regla 4): "R 0001-00000341".
    puntoVenta: integer("punto_venta").notNull().default(1),
    numero: integer().notNull(),
    fecha: fechaActual("fecha"),
    importe: integer().notNull(), // centavos
    medio: text({ enum: MEDIOS_DE_PAGO }).notNull(),
    observacion: text(),
  },
  (tabla) => [uniqueIndex("pagos_numero").on(tabla.puntoVenta, tabla.numero)],
);

// El saldo del cliente NO se guarda: es la suma de débitos menos créditos de
// esta tabla (regla 7), así hay una sola fuente de verdad.
export const movimientosCuenta = sqliteTable(
  "movimientos_cuenta",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    // Origen: una factura (débito por venta, crédito por anulación) o un pago.
    facturaId: integer("factura_id").references(() => facturas.id),
    pagoId: integer("pago_id").references(() => pagos.id),
    tipo: text({ enum: TIPOS_MOVIMIENTO_CUENTA }).notNull(),
    importe: integer().notNull(), // centavos, siempre positivo; el tipo da el signo
    descripcion: text().notNull(),
    fecha: fechaActual("fecha"),
  },
  (tabla) => [index("movimientos_cuenta_cliente").on(tabla.clienteId, tabla.fecha)],
);

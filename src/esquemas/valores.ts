// Valores permitidos de los campos con opciones fijas. Viven acá, sin dependencias,
// para que los usen tanto la base (db/esquema.ts) como los esquemas de zod y los
// formularios del navegador sin arrastrar drizzle.
export const ROLES = ["admin", "vendedor"] as const;
export const TIPOS_DOCUMENTO = ["DNI", "CUIT"] as const;
export const TIPOS_MOVIMIENTO_STOCK = ["venta", "anulacion", "ingreso", "egreso"] as const;
export const FORMAS_DE_PAGO = ["contado", "tarjeta", "cuenta_corriente"] as const;
export const TIPOS_TARJETA = ["debito", "credito"] as const;
export const ESTADOS_FACTURA = ["emitida", "anulada"] as const;
export const MEDIOS_DE_PAGO = ["efectivo", "transferencia", "tarjeta_debito"] as const;
export const TIPOS_MOVIMIENTO_CUENTA = ["debito", "credito"] as const;

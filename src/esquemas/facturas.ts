import { z } from "zod";
import { esquemaPaginacion } from "./comunes";
import { ESTADOS_FACTURA, FORMAS_DE_PAGO, TIPOS_TARJETA } from "./valores";

// POST /api/facturas. El cuerpo lleva el comprador, los productos con sus cantidades y la
// forma de pago. NO lleva precios ni totales: los pone el servidor (sección 11.1).
// Todos los objetos son `.strict()`: un campo que no está previsto se rechaza con 422.
// Por eso un campo con el número completo de la tarjeta no pasa (regla 9).
const item = z
  .object({
    productoId: z.number({ error: "Elegí un producto." }).int().positive("Elegí un producto."),
    cantidad: z
      .number({ error: "Tiene que ser un número." })
      .int("Tiene que ser un número entero.")
      .positive("Tiene que ser mayor a cero."),
  })
  .strict();

const pago = z.discriminatedUnion(
  "forma",
  [
    z
      .object({
        forma: z.literal("contado"),
        // Si falta, se toma el total: se cobró justo.
        montoRecibido: z.number().int().positive("Tiene que ser mayor a cero.").optional(),
      })
      .strict(),
    z
      .object({
        forma: z.literal("tarjeta"),
        tarjeta: z
          .object({
            tipo: z.enum(TIPOS_TARJETA, "Elegí débito o crédito."),
            marca: z.string().trim().min(1, "Es obligatoria."),
            // Exactamente 4 dígitos: así un número completo no entra por acá.
            ultimos4: z.string().regex(/^\d{4}$/, "Son exactamente 4 dígitos."),
          })
          .strict(),
      })
      .strict(),
    z.object({ forma: z.literal("cuenta_corriente") }).strict(),
  ],
  "Elegí la forma de pago.",
);

export const esquemaCrearFactura = z
  .object({
    clienteId: z.number().int().positive().nullable().optional(), // nulo o ausente = consumidor final
    items: z
      .array(item)
      .min(1, "Agregá al menos un producto.")
      .refine(
        (items) => new Set(items.map((i) => i.productoId)).size === items.length,
        "No puede haber productos repetidos: sumá las cantidades en un solo renglón.",
      ),
    pago,
  })
  .strict();

// POST /api/facturas/{id}/anulacion: el motivo es obligatorio (RF-V9).
export const esquemaAnularFactura = z
  .object({ motivo: z.string("El motivo es obligatorio.").trim().min(1, "El motivo es obligatorio.") })
  .strict();

// GET /api/facturas: llegan como texto desde la URL. Los días son AAAA-MM-DD en hora de Argentina.
export const esquemaListarFacturas = esquemaPaginacion.extend({
  q: z.string().trim().optional(), // número de factura o nombre del cliente
  desde: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
  hasta: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  forma: z.enum(FORMAS_DE_PAGO).optional(),
  estado: z.enum(ESTADOS_FACTURA).optional(),
});

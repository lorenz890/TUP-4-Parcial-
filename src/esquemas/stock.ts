import { z } from "zod";
import { esquemaPaginacion } from "./comunes";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO, TIPOS_MOVIMIENTO_STOCK } from "./valores";

// POST /api/productos/{id}/movimientos: ingreso o egreso manual. La cantidad es
// siempre positiva; el signo lo pone el servicio según el tipo.
export const esquemaMovimientoManual = z
  .object({
    tipo: z.enum(["ingreso", "egreso"], "Elegí el tipo."),
    cantidad: z.coerce
      .number({ error: "Tiene que ser un número." })
      .int("Tiene que ser un número entero.")
      .positive("Tiene que ser mayor a cero."),
    motivo: z.string("Elegí un motivo."),
    observacion: z.string().trim().optional(),
  })
  .strict()
  .superRefine((datos, contexto) => {
    // Cada tipo tiene su lista de motivos válidos.
    const validos: readonly string[] = datos.tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;
    if (!validos.includes(datos.motivo)) {
      contexto.addIssue({ code: "custom", path: ["motivo"], message: "Elegí un motivo." });
    }
  });

// GET /api/movimientos-stock y /api/productos/{id}/movimientos. Los días son
// AAAA-MM-DD en hora de Argentina.
export const esquemaListarMovimientos = esquemaPaginacion.extend({
  productoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(TIPOS_MOVIMIENTO_STOCK).optional(),
  desde: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
  hasta: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
});

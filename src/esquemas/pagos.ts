import { z } from "zod";
import "./comunes";
import { MEDIOS_DE_PAGO } from "./valores";

// POST /api/clientes/{id}/pagos. El importe va en centavos y siempre positivo.
export const esquemaRegistrarPago = z
  .object({
    importe: z
      .number({ error: "Ingresá un importe válido." })
      .int("Tiene que ser un importe en centavos.")
      .positive("Tiene que ser mayor a cero."),
    medio: z.enum(MEDIOS_DE_PAGO, "Elegí el medio de pago."),
    observacion: z.string().trim().optional(),
  })
  .strict();

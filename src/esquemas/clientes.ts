import { z } from "zod";
import { esquemaPaginacion } from "./comunes";
import { TIPOS_DOCUMENTO } from "./valores";

// Regla del documento según su tipo. Devuelve el mensaje de error, o null si está bien.
// La usan este esquema (el formulario la adelanta) y, por lo tanto, también el servidor.
export function mensajeDeDocumentoInvalido(tipo: (typeof TIPOS_DOCUMENTO)[number], numero: string) {
  if (tipo === "DNI") return /^\d{7,8}$/.test(numero) ? null : "El DNI tiene 7 u 8 dígitos.";
  return /^\d{11}$/.test(numero) ? null : "El CUIT tiene 11 dígitos.";
}

const campoTipoDoc = z.enum(TIPOS_DOCUMENTO, "Elegí el tipo de documento.");
// Se guarda solo con dígitos: los puntos y guiones son formato ("28.456.123" → "28456123").
const campoNroDoc = z
  .string()
  .trim()
  .min(1, "Es obligatorio.")
  .transform((texto) => texto.replace(/\D/g, ""));
const campoNombre = z.string().trim().min(1, "Es obligatorio.");

// Los textos opcionales vacíos se guardan como nulo.
const textoOpcional = z
  .string()
  .trim()
  .transform((texto) => (texto === "" ? null : texto))
  .nullable()
  .optional();
const emailOpcional = z
  .string()
  .trim()
  .refine((texto) => texto === "" || /^\S+@\S+\.\S+$/.test(texto), "Ingresá un email válido.")
  .transform((texto) => (texto === "" ? null : texto))
  .nullable()
  .optional();
// Límite de crédito en centavos; nulo = sin límite.
const limiteOpcional = z
  .number({ error: "Ingresá un importe válido." })
  .int("Tiene que ser un importe en centavos.")
  .min(0, "No puede ser negativo.")
  .nullable()
  .optional();

function validarDocumento(
  datos: { tipoDoc?: (typeof TIPOS_DOCUMENTO)[number]; nroDoc?: string },
  contexto: z.RefinementCtx,
) {
  if (datos.tipoDoc === undefined || datos.nroDoc === undefined) return;
  const mensaje = mensajeDeDocumentoInvalido(datos.tipoDoc, datos.nroDoc);
  if (mensaje) contexto.addIssue({ code: "custom", path: ["nroDoc"], message: mensaje });
}

// POST /api/clientes (también lo usa el alta rápida de Nueva venta).
export const esquemaCrearCliente = z
  .object({
    tipoDoc: campoTipoDoc,
    nroDoc: campoNroDoc,
    nombre: campoNombre,
    domicilio: textoOpcional,
    telefono: textoOpcional,
    email: emailOpcional,
    cuentaCorriente: z.boolean().default(false),
    limiteCredito: limiteOpcional,
  })
  .strict()
  .superRefine(validarDocumento);

// PATCH /api/clientes/{id}: cualquier campo del alta, más `activo`.
export const esquemaEditarCliente = z
  .object({
    tipoDoc: campoTipoDoc,
    nroDoc: campoNroDoc,
    nombre: campoNombre,
    domicilio: textoOpcional,
    telefono: textoOpcional,
    email: emailOpcional,
    cuentaCorriente: z.boolean(),
    limiteCredito: limiteOpcional,
    activo: z.boolean(),
  })
  .partial()
  .strict()
  .superRefine((datos, contexto) => {
    // El tipo y el número se cambian juntos: uno solo no alcanza para validar el documento.
    if ((datos.tipoDoc === undefined) !== (datos.nroDoc === undefined)) {
      contexto.addIssue({
        code: "custom",
        path: ["nroDoc"],
        message: "El tipo y el número de documento se cambian juntos.",
      });
      return;
    }
    validarDocumento(datos, contexto);
  });

// GET /api/clientes: llegan como texto desde la URL.
export const esquemaListarClientes = esquemaPaginacion.extend({
  q: z.string().trim().optional(),
  conDeuda: z.enum(["true"]).optional(),
  orden: z.enum(["saldo", "nombre"]).optional(),
  // Por defecto solo los activos (regla 12: los dados de baja se conservan pero no se ofrecen).
  activo: z.enum(["true", "false", "todos"]).optional(),
});

// GET /api/clientes/{id}/cuenta: días AAAA-MM-DD en hora de Argentina.
export const esquemaConsultarCuenta = z.object({
  desde: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
  hasta: z.iso.date("Usá el formato AAAA-MM-DD.").optional(),
});

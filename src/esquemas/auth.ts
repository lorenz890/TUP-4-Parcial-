import { z } from "zod";
import "./comunes";

// El email se guarda siempre en minúsculas para que no haya dos usuarios
// distintos por una diferencia de mayúsculas.
export const campoEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ingresá un email válido.");

export const campoContrasenaNueva = z
  .string()
  .min(8, "Tiene que tener al menos 8 caracteres.");

export const esquemaLogin = z
  .object({
    email: campoEmail,
    password: z.string().min(1, "Es obligatoria."),
  })
  .strict();

export const esquemaCambioContrasena = z
  .object({
    actual: z.string().min(1, "Es obligatoria."),
    nueva: campoContrasenaNueva,
  })
  .strict();

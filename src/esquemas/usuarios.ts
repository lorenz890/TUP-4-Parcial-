import { z } from "zod";
import { campoContrasenaNueva, campoEmail } from "./auth";
import { esquemaPaginacion } from "./comunes";
import { ROLES } from "./valores";

const campoNombre = z.string().trim().min(1, "Es obligatorio.");
const campoRol = z.enum(ROLES, "Elegí un rol.");

// POST /api/usuarios. `.strict()` rechaza cualquier campo que no esté previsto.
export const esquemaCrearUsuario = z
  .object({
    nombre: campoNombre,
    email: campoEmail,
    rol: campoRol,
    password: campoContrasenaNueva, // contraseña temporal
  })
  .strict();

// PATCH /api/usuarios/{id}: cualquiera de estos campos.
export const esquemaEditarUsuario = z
  .object({
    nombre: campoNombre,
    email: campoEmail,
    rol: campoRol,
    activo: z.boolean(),
  })
  .partial()
  .strict();

// GET /api/usuarios: llegan como texto desde la URL.
export const esquemaListarUsuarios = esquemaPaginacion.extend({
  q: z.string().trim().optional(),
  activo: z.enum(["true", "false"]).optional(),
});

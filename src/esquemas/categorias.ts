import { z } from "zod";
import "./comunes";

const campoNombre = z.string().trim().min(1, "Es obligatorio.");

// POST /api/categorias
export const esquemaCrearCategoria = z.object({ nombre: campoNombre }).strict();

// PATCH /api/categorias/{id}
export const esquemaEditarCategoria = z
  .object({ nombre: campoNombre, activa: z.boolean() })
  .partial()
  .strict();

// GET /api/categorias: por defecto solo las activas; `todas` incluye las dadas de baja
// y es solo para el administrador (para poder reactivarlas).
export const esquemaListarCategorias = z.object({
  activa: z.enum(["todas"]).optional(),
});

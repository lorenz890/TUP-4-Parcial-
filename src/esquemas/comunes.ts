import { z } from "zod";

// Mensajes de zod en español, para la API y para todos los formularios.
// Todos los esquemas importan este módulo, así que se configura una sola vez.
z.config(z.locales.es());

// Identificador de la URL (/api/usuarios/7): llega como texto.
export const esquemaId = z.coerce.number().int().positive();

// Paginación de los listados (sección 11.1): page desde 1, pageSize hasta 100.
export const esquemaPaginacion = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

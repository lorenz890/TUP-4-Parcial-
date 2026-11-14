import { z } from "zod";
import { esquemaPaginacion } from "./comunes";

// Los números que se escriben en un formulario llegan como texto; `coerce` los
// convierte. El precio llega ya en centavos (lo arma el campo de importe).
const campoCodigo = z
  .string()
  .trim()
  .min(1, "Es obligatorio.")
  .transform((codigo) => codigo.toUpperCase()); // "he-001" y "HE-001" son el mismo código
const campoDescripcion = z.string().trim().min(1, "Es obligatoria.");
const campoCategoria = z.coerce
  .number({ error: "Elegí una categoría." })
  .int("Elegí una categoría.")
  .positive("Elegí una categoría.");
const campoPrecio = z
  .number({ error: "Ingresá un importe válido." })
  .int("Tiene que ser un importe en centavos.")
  .min(0, "No puede ser negativo.");
const campoStockMinimo = z.coerce
  .number({ error: "Tiene que ser un número." })
  .int("Tiene que ser un número entero.")
  .min(0, "No puede ser negativo.");

// POST /api/productos. No admite `existencia`: el stock inicial se carga como un ingreso.
export const esquemaCrearProducto = z
  .object({
    codigo: campoCodigo,
    descripcion: campoDescripcion,
    categoriaId: campoCategoria,
    precio: campoPrecio,
    stockMinimo: campoStockMinimo.default(0),
    stockInicial: z.coerce
      .number({ error: "Tiene que ser un número." })
      .int("Tiene que ser un número entero.")
      .min(0, "No puede ser negativo.")
      .optional(),
  })
  .strict();

// PATCH /api/productos/{id}. `.strict()` es lo que rechaza `existencia` (regla 2).
export const esquemaEditarProducto = z
  .object({
    codigo: campoCodigo,
    descripcion: campoDescripcion,
    categoriaId: campoCategoria,
    precio: campoPrecio,
    stockMinimo: campoStockMinimo,
    activo: z.boolean(),
  })
  .partial()
  .strict();

// GET /api/productos: llegan como texto desde la URL.
export const esquemaListarProductos = esquemaPaginacion.extend({
  q: z.string().trim().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  bajoMinimo: z.enum(["true"]).optional(),
  // Por defecto solo los activos; `false` y `todos` son para el administrador.
  activo: z.enum(["true", "false", "todos"]).optional(),
});

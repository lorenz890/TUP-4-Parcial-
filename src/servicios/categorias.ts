import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/conexion";
import { categorias, productos } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import {
  esquemaCrearCategoria,
  esquemaEditarCategoria,
  esquemaListarCategorias,
} from "@/esquemas/categorias";
import { ApiError } from "@/lib/api-error";
import { exigirAdmin, type UsuarioAutenticado } from "@/lib/permisos";

// El nombre es único sin importar mayúsculas: "Jardín" y "jardín" son la misma.
async function buscarPorNombre(nombre: string, excluirId?: number) {
  const [fila] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        sql`lower(${categorias.nombre}) = lower(${nombre})`,
        excluirId ? ne(categorias.id, excluirId) : undefined,
      ),
    );
  return fila;
}

// RF-P7: todas las categorías activas, sin paginar. Con `activa=todas` también las
// dadas de baja, solo para el administrador.
export async function listarCategorias(usuario: UsuarioAutenticado, entrada: unknown) {
  const { activa } = esquemaListarCategorias.parse(entrada);
  if (activa === "todas") exigirAdmin(usuario);

  const filas = await db
    .select({ id: categorias.id, nombre: categorias.nombre, activa: categorias.activa })
    .from(categorias)
    .where(activa === "todas" ? undefined : eq(categorias.activa, true))
    .orderBy(categorias.nombre);

  // Cuántos productos activos tiene cada categoría (lo muestra la pantalla de categorías).
  const cuentas = await db
    .select({ categoriaId: productos.categoriaId, cantidad: count() })
    .from(productos)
    .where(eq(productos.activo, true))
    .groupBy(productos.categoriaId);

  return filas.map((fila) => ({
    ...fila,
    productosActivos: cuentas.find((cuenta) => cuenta.categoriaId === fila.id)?.cantidad ?? 0,
  }));
}

// RF-P7: alta, solo admin.
export async function crearCategoria(usuario: UsuarioAutenticado, entrada: unknown) {
  const datos = esquemaCrearCategoria.parse(entrada);
  exigirAdmin(usuario);

  if (await buscarPorNombre(datos.nombre)) {
    throw new ApiError(409, "NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  }

  const [creada] = await db
    .insert(categorias)
    .values({ nombre: datos.nombre })
    .returning({ id: categorias.id, nombre: categorias.nombre, activa: categorias.activa });
  return creada;
}

// RF-P7, regla 12: edición y baja lógica, solo admin.
export async function editarCategoria(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const datos = esquemaEditarCategoria.parse(entrada);
  exigirAdmin(usuario);

  const [actual] = await db.select().from(categorias).where(eq(categorias.id, id));
  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe.");
  }

  if (datos.nombre && (await buscarPorNombre(datos.nombre, id))) {
    throw new ApiError(409, "NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  }

  // No se puede dar de baja una categoría que todavía tiene productos activos.
  if (datos.activa === false && actual.activa) {
    const [{ cantidad }] = await db
      .select({ cantidad: sql<number>`count(*)` })
      .from(productos)
      .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)));
    if (cantidad > 0) {
      throw new ApiError(
        409,
        "CATEGORIA_EN_USO",
        "La categoría tiene productos activos: pasalos a otra categoría o dalos de baja primero.",
      );
    }
  }

  // Un PATCH vacío no cambia nada (y drizzle no admite un UPDATE sin campos).
  if (Object.keys(datos).length === 0) {
    return { id: actual.id, nombre: actual.nombre, activa: actual.activa };
  }

  const [editada] = await db
    .update(categorias)
    .set(datos)
    .where(eq(categorias.id, id))
    .returning({ id: categorias.id, nombre: categorias.nombre, activa: categorias.activa });
  return editada;
}

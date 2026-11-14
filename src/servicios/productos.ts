import { and, count, eq, like, lt, ne, or } from "drizzle-orm";
import { db } from "@/db/conexion";
import { categorias, productos } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import {
  esquemaCrearProducto,
  esquemaEditarProducto,
  esquemaListarProductos,
} from "@/esquemas/productos";
import { ApiError } from "@/lib/api-error";
import { exigirAdmin, type UsuarioAutenticado } from "@/lib/permisos";
import { moverStock } from "./stock";

// Columnas del producto con el nombre de su categoría, para armar la forma pública.
const columnas = {
  id: productos.id,
  codigo: productos.codigo,
  descripcion: productos.descripcion,
  categoriaId: categorias.id,
  categoriaNombre: categorias.nombre,
  precio: productos.precio,
  existencia: productos.existencia,
  stockMinimo: productos.stockMinimo,
  activo: productos.activo,
};

// Forma pública del producto (sección 11.4). `bajoMinimo` se calcula, no se guarda.
function aProducto(fila: {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  existencia: number;
  stockMinimo: number;
  activo: boolean;
}) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    descripcion: fila.descripcion,
    categoria: { id: fila.categoriaId, nombre: fila.categoriaNombre },
    precio: fila.precio,
    existencia: fila.existencia,
    stockMinimo: fila.stockMinimo,
    bajoMinimo: fila.existencia < fila.stockMinimo,
    activo: fila.activo,
  };
}

async function leerProducto(id: number) {
  const [fila] = await db
    .select(columnas)
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId))
    .where(eq(productos.id, id));
  if (!fila) {
    throw new ApiError(404, "NO_ENCONTRADO", "El producto no existe.");
  }
  return aProducto(fila);
}

async function existeCodigo(codigo: string, excluirId?: number) {
  const [fila] = await db
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.codigo, codigo), excluirId ? ne(productos.id, excluirId) : undefined));
  return fila !== undefined;
}

// Un producto solo puede pertenecer a una categoría que existe y está activa.
async function exigirCategoriaActiva(categoriaId: number) {
  const [fila] = await db
    .select({ activa: categorias.activa })
    .from(categorias)
    .where(eq(categorias.id, categoriaId));
  if (!fila || !fila.activa) {
    throw new ApiError(422, "VALIDACION", "Hay campos con errores.", [
      { campo: "categoriaId", mensaje: "La categoría no existe o está dada de baja." },
    ]);
  }
}

// RF-P1: catálogo paginado, para cualquier usuario. Por defecto solo los activos;
// ver los inactivos es cosa del administrador.
export async function listarProductos(usuario: UsuarioAutenticado, entrada: unknown) {
  const { q, categoriaId, bajoMinimo, activo = "true", page, pageSize } =
    esquemaListarProductos.parse(entrada);
  if (activo !== "true") exigirAdmin(usuario);

  const filtros = and(
    q ? or(like(productos.codigo, `%${q}%`), like(productos.descripcion, `%${q}%`)) : undefined,
    categoriaId ? eq(productos.categoriaId, categoriaId) : undefined,
    bajoMinimo ? lt(productos.existencia, productos.stockMinimo) : undefined,
    activo === "todos" ? undefined : eq(productos.activo, activo === "true"),
  );

  const [{ total }] = await db.select({ total: count() }).from(productos).where(filtros);
  const filas = await db
    .select(columnas)
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId))
    .where(filtros)
    .orderBy(productos.codigo)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: filas.map(aProducto), page, pageSize, total };
}

// RF-P1: un producto, para cualquier usuario.
export async function obtenerProducto(usuario: UsuarioAutenticado, idCrudo: unknown) {
  const id = esquemaId.parse(idCrudo);
  return leerProducto(id);
}

// RF-P2: alta, solo admin. La existencia NO se acepta: el stock inicial entra como
// un movimiento de ingreso (regla 2), en la misma transacción que el alta.
export async function crearProducto(usuario: UsuarioAutenticado, entrada: unknown) {
  const datos = esquemaCrearProducto.parse(entrada);
  exigirAdmin(usuario);

  if (await existeCodigo(datos.codigo)) {
    throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.");
  }
  await exigirCategoriaActiva(datos.categoriaId);

  const id = await db.transaction(async (tx) => {
    const [creado] = await tx
      .insert(productos)
      .values({
        codigo: datos.codigo,
        descripcion: datos.descripcion,
        categoriaId: datos.categoriaId,
        precio: datos.precio,
        stockMinimo: datos.stockMinimo,
      })
      .returning({ id: productos.id });

    if (datos.stockInicial) {
      await moverStock(tx, {
        productoId: creado.id,
        usuarioId: usuario.id,
        tipo: "ingreso",
        cantidad: datos.stockInicial,
        motivo: "Stock inicial",
      });
    }
    return creado.id;
  });

  return leerProducto(id);
}

// RF-P2, RF-P3, regla 12: edición y baja lógica, solo admin. `existencia` no está en
// el esquema: si llega, zod lo rechaza con 422.
export async function editarProducto(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const datos = esquemaEditarProducto.parse(entrada);
  exigirAdmin(usuario);

  const actual = await leerProducto(id);

  if (datos.codigo && (await existeCodigo(datos.codigo, id))) {
    throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.");
  }
  if (datos.categoriaId && datos.categoriaId !== actual.categoria.id) {
    await exigirCategoriaActiva(datos.categoriaId);
  }

  // Un PATCH vacío no cambia nada (y drizzle no admite un UPDATE sin campos).
  if (Object.keys(datos).length === 0) return actual;

  await db.update(productos).set(datos).where(eq(productos.id, id));
  return leerProducto(id);
}

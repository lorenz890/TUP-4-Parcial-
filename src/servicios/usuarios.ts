import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, count, eq, like, or } from "drizzle-orm";
import { db } from "@/db/conexion";
import { usuarios } from "@/db/esquema";
import { esquemaId } from "@/esquemas/comunes";
import {
  esquemaCrearUsuario,
  esquemaEditarUsuario,
  esquemaListarUsuarios,
} from "@/esquemas/usuarios";
import { ApiError } from "@/lib/api-error";
import { exigirAdmin, type UsuarioAutenticado } from "@/lib/permisos";

// Forma pública del usuario: nunca incluye el hash de la contraseña.
const columnasPublicas = {
  id: usuarios.id,
  nombre: usuarios.nombre,
  email: usuarios.email,
  rol: usuarios.rol,
  activo: usuarios.activo,
  creadoEn: usuarios.creadoEn,
};

async function buscarPorEmail(email: string) {
  const [fila] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  return fila;
}

// RF-U4: listado paginado, solo admin.
export async function listarUsuarios(usuario: UsuarioAutenticado, entrada: unknown) {
  const { q, activo, page, pageSize } = esquemaListarUsuarios.parse(entrada);
  exigirAdmin(usuario);

  const filtros = and(
    q ? or(like(usuarios.nombre, `%${q}%`), like(usuarios.email, `%${q}%`)) : undefined,
    activo ? eq(usuarios.activo, activo === "true") : undefined,
  );

  const [{ total }] = await db.select({ total: count() }).from(usuarios).where(filtros);
  const data = await db
    .select(columnasPublicas)
    .from(usuarios)
    .where(filtros)
    .orderBy(usuarios.nombre)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data, page, pageSize, total };
}

// RF-U4: alta con contraseña temporal, solo admin.
export async function crearUsuario(usuario: UsuarioAutenticado, entrada: unknown) {
  const datos = esquemaCrearUsuario.parse(entrada);
  exigirAdmin(usuario);

  if (await buscarPorEmail(datos.email)) {
    throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  }

  const [creado] = await db
    .insert(usuarios)
    .values({
      nombre: datos.nombre,
      email: datos.email,
      rol: datos.rol,
      hashContrasena: await bcrypt.hash(datos.password, 10),
    })
    .returning(columnasPublicas);
  return creado;
}

// RF-U4, regla 12: edita, cambia el rol o desactiva (nunca se borra), solo admin.
export async function editarUsuario(usuario: UsuarioAutenticado, idCrudo: unknown, entrada: unknown) {
  const id = esquemaId.parse(idCrudo);
  const datos = esquemaEditarUsuario.parse(entrada);
  exigirAdmin(usuario);

  const [actual] = await db.select(columnasPublicas).from(usuarios).where(eq(usuarios.id, id));
  if (!actual) {
    throw new ApiError(404, "NO_ENCONTRADO", "El usuario no existe.");
  }

  // Un admin no puede dejarse sin acceso a sí mismo.
  const seDesactiva = datos.activo === false;
  const pierdeRol = datos.rol !== undefined && datos.rol !== "admin";
  if (id === usuario.id && (seDesactiva || pierdeRol)) {
    throw new ApiError(
      422,
      "OPERACION_SOBRE_SI_MISMO",
      "No podés desactivarte ni quitarte el rol de administrador a vos mismo.",
    );
  }

  if (datos.email && datos.email !== actual.email && (await buscarPorEmail(datos.email))) {
    throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  }

  // Un PATCH vacío no cambia nada (y drizzle no admite un UPDATE sin campos).
  if (Object.keys(datos).length === 0) return actual;

  const [editado] = await db
    .update(usuarios)
    .set(datos)
    .where(eq(usuarios.id, id))
    .returning(columnasPublicas);
  return editado;
}

// RF-U5: el admin restablece la contraseña. La temporal se muestra una sola vez:
// en la base queda solo el hash.
export async function restablecerContrasena(usuario: UsuarioAutenticado, idCrudo: unknown) {
  const id = esquemaId.parse(idCrudo);
  exigirAdmin(usuario);

  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, id));
  if (!existe) {
    throw new ApiError(404, "NO_ENCONTRADO", "El usuario no existe.");
  }

  const passwordTemporal = randomBytes(9).toString("base64url"); // 12 caracteres
  await db
    .update(usuarios)
    .set({ hashContrasena: await bcrypt.hash(passwordTemporal, 10) })
    .where(eq(usuarios.id, id));
  return { passwordTemporal };
}

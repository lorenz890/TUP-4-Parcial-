import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/conexion";
import { usuarios } from "@/db/esquema";
import { esquemaCambioContrasena, esquemaLogin } from "@/esquemas/auth";
import { ApiError } from "@/lib/api-error";
import type { UsuarioAutenticado } from "@/lib/permisos";

// RF-U1. Devuelve el usuario; abrir la cookie le toca al adaptador porque el
// servicio no conoce HTTP.
export async function iniciarSesion(entrada: unknown): Promise<UsuarioAutenticado> {
  const { email, password } = esquemaLogin.parse(entrada);

  const [fila] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  const coincide = fila && (await bcrypt.compare(password, fila.hashContrasena));

  // Mismo mensaje si el email no existe, la contraseña no coincide o el usuario
  // está inactivo, para no revelar cuáles emails están registrados.
  if (!fila || !coincide || !fila.activo) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }

  return { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol };
}

// RF-U5: cada usuario cambia la suya (cualquier rol, por eso no hay exigirAdmin).
export async function cambiarContrasena(usuario: UsuarioAutenticado, entrada: unknown) {
  const { actual, nueva } = esquemaCambioContrasena.parse(entrada);

  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, usuario.id));
  if (!(await bcrypt.compare(actual, fila.hashContrasena))) {
    throw new ApiError(
      422,
      "CONTRASENA_ACTUAL_INCORRECTA",
      "La contraseña actual no es correcta.",
    );
  }

  await db
    .update(usuarios)
    .set({ hashContrasena: await bcrypt.hash(nueva, 10) })
    .where(eq(usuarios.id, usuario.id));
}

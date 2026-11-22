import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/conexion";
import { usuarios } from "@/db/esquema";
import { esquemaCambioContrasena, esquemaLogin, esquemaLoginDemo } from "@/esquemas/auth";
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

// Usuarios del seed que usa el modo demo. Están acá, en el servidor, para que el
// navegador nunca sepa a qué cuenta entra; no hace falta ninguna contraseña.
const EMAILS_DEMO = {
  admin: "admin@comercio.test",
  vendedor: "pablo@comercio.test",
};

// Modo demo pedido por el profesor: entra con un usuario del seed sin escribir la
// contraseña. Solo funciona con DEMO_LOGIN=true; se controla ACÁ y no solo
// escondiendo los botones, porque una acción del servidor se puede llamar igual.
export async function iniciarSesionDemo(entrada: unknown): Promise<UsuarioAutenticado> {
  const { rol } = esquemaLoginDemo.parse(entrada);

  if (process.env.DEMO_LOGIN !== "true") {
    throw new ApiError(403, "SIN_PERMISO", "El modo demo está apagado.");
  }

  const [fila] = await db.select().from(usuarios).where(eq(usuarios.email, EMAILS_DEMO[rol]));
  // Misma regla que el login normal: un usuario inactivo no entra.
  if (!fila || !fila.activo || fila.rol !== rol) {
    throw new ApiError(404, "NO_ENCONTRADO", "No existe el usuario demo de ese rol.");
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

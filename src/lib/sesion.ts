import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/conexion";
import { usuarios } from "@/db/esquema";
import {
  crearValorCookie,
  DURACION_SEGUNDOS,
  leerValorCookie,
  NOMBRE_COOKIE,
} from "./cookie-sesion";
import type { UsuarioAutenticado } from "./permisos";

export async function abrirSesion(usuarioId: number) {
  (await cookies()).set(NOMBRE_COOKIE, crearValorCookie(usuarioId), {
    httpOnly: true, // el JavaScript de la página no puede leerla
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(NOMBRE_COOKIE);
}

// Resuelve el usuario contra la base EN CADA PEDIDO (sección 10.5): si lo
// desactivaron o le cambiaron el rol, pierde el acceso al instante aunque
// conserve la cookie. `cache` evita repetir la consulta cuando el layout y la
// página la piden dentro del mismo pedido.
export const usuarioActual = cache(async (): Promise<UsuarioAutenticado | null> => {
  const id = leerValorCookie((await cookies()).get(NOMBRE_COOKIE)?.value);
  if (id === null) return null;

  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!fila || !fila.activo) return null;

  return { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol };
});

// Barrera 2 (sección 10.5): las páginas y el layout la usan para volver a
// comprobar que haya un usuario válido.
export async function exigirUsuario(): Promise<UsuarioAutenticado> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}

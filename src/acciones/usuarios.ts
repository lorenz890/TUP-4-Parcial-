"use server";

import { accion } from "@/lib/accion";
import { crearUsuario, editarUsuario, restablecerContrasena } from "@/servicios/usuarios";

// RF-U4. Las acciones y las rutas /api/usuarios llaman a los mismos servicios.
export const crearUsuarioAccion = accion(crearUsuario);

export const editarUsuarioAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  editarUsuario(usuario, entrada.id, entrada.datos),
);

// RF-U5
export const restablecerContrasenaAccion = accion((usuario, id: number) =>
  restablecerContrasena(usuario, id),
);

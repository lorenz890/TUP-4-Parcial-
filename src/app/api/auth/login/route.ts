import { iniciarSesion } from "@/servicios/auth";
import { rutaPublica } from "@/lib/ruta";
import { abrirSesion } from "@/lib/sesion";

// RF-U1. La cookie la abre el adaptador porque el servicio no conoce HTTP.
export const POST = rutaPublica(async ({ cuerpo }) => {
  const usuario = await iniciarSesion(cuerpo);
  await abrirSesion(usuario.id);
  return usuario;
});

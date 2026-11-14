import { ruta } from "@/lib/ruta";
import { cerrarSesion } from "@/lib/sesion";

// RF-U1. Responde 204: borra la cookie y no devuelve nada.
export const POST = ruta(async () => {
  await cerrarSesion();
});

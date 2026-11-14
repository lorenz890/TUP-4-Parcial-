import { cambiarContrasena } from "@/servicios/auth";
import { ruta } from "@/lib/ruta";

// RF-U5
export const PUT = ruta(({ usuario, cuerpo }) => cambiarContrasena(usuario, cuerpo));

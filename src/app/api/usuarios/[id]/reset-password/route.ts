import { restablecerContrasena } from "@/servicios/usuarios";
import { ruta } from "@/lib/ruta";

// RF-U5
export const POST = ruta(({ usuario, params }) => restablecerContrasena(usuario, params.id));

import { editarUsuario } from "@/servicios/usuarios";
import { ruta } from "@/lib/ruta";

// RF-U4
export const PATCH = ruta(({ usuario, params, cuerpo }) =>
  editarUsuario(usuario, params.id, cuerpo),
);

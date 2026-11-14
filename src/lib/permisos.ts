import type { ROLES } from "@/esquemas/valores";
import { ApiError } from "./api-error";

// El usuario que hizo el pedido, ya buscado en la base. Es lo primero que recibe
// cada función de servicio.
export type UsuarioAutenticado = {
  id: number;
  nombre: string;
  email: string;
  rol: (typeof ROLES)[number];
};

// Los servicios llaman a esta función: el permiso lo decide siempre el servidor,
// ocultar un botón en la pantalla es solo una ayuda visual (sección 10.5).
export function exigirAdmin(usuario: UsuarioAutenticado) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "No tenés permiso para hacer esto.");
  }
}

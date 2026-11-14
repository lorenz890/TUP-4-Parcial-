import { editarCategoria } from "@/servicios/categorias";
import { ruta } from "@/lib/ruta";

// RF-P7
export const PATCH = ruta(({ usuario, params, cuerpo }) =>
  editarCategoria(usuario, params.id, cuerpo),
);

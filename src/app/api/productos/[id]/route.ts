import { editarProducto, obtenerProducto } from "@/servicios/productos";
import { ruta } from "@/lib/ruta";

// RF-P1, RF-P2, RF-P3
export const GET = ruta(({ usuario, params }) => obtenerProducto(usuario, params.id));

export const PATCH = ruta(({ usuario, params, cuerpo }) =>
  editarProducto(usuario, params.id, cuerpo),
);

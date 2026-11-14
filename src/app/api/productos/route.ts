import { crearProducto, listarProductos } from "@/servicios/productos";
import { ruta } from "@/lib/ruta";

// RF-P1, RF-P2
export const GET = ruta(({ usuario, consulta }) =>
  listarProductos(usuario, Object.fromEntries(consulta)),
);

export const POST = ruta(({ usuario, cuerpo }) => crearProducto(usuario, cuerpo), { estado: 201 });

import { crearCategoria, listarCategorias } from "@/servicios/categorias";
import { ruta } from "@/lib/ruta";

// RF-P7
export const GET = ruta(({ usuario, consulta }) =>
  listarCategorias(usuario, Object.fromEntries(consulta)),
);

export const POST = ruta(({ usuario, cuerpo }) => crearCategoria(usuario, cuerpo), { estado: 201 });

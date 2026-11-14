"use server";

import { accion } from "@/lib/accion";
import { crearCategoria, editarCategoria } from "@/servicios/categorias";

// RF-P7
export const crearCategoriaAccion = accion(crearCategoria);

export const editarCategoriaAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  editarCategoria(usuario, entrada.id, entrada.datos),
);

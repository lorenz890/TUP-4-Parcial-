"use server";

import { accion } from "@/lib/accion";
import { crearProducto, editarProducto } from "@/servicios/productos";
import { registrarMovimientoManual } from "@/servicios/stock";

// RF-P2, RF-P3. Las acciones y las rutas /api/productos llaman a los mismos servicios.
export const crearProductoAccion = accion(crearProducto);

export const editarProductoAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  editarProducto(usuario, entrada.id, entrada.datos),
);

// RF-P4, RF-P5
export const registrarMovimientoAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  registrarMovimientoManual(usuario, entrada.id, entrada.datos),
);

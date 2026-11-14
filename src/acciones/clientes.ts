"use server";

import { accion } from "@/lib/accion";
import { crearCliente, editarCliente } from "@/servicios/clientes";
import { registrarPago } from "@/servicios/pagos";

// RF-C2, RF-C5, RF-C7. Las acciones y las rutas /api/clientes llaman a los mismos servicios.
export const crearClienteAccion = accion(crearCliente);

export const editarClienteAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  editarCliente(usuario, entrada.id, entrada.datos),
);

export const registrarPagoAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  registrarPago(usuario, entrada.id, entrada.datos),
);

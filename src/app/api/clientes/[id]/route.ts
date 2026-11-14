import { editarCliente, obtenerCliente } from "@/servicios/clientes";
import { ruta } from "@/lib/ruta";

// RF-C3, RF-C2, RF-C7
export const GET = ruta(({ usuario, params }) => obtenerCliente(usuario, params.id));

export const PATCH = ruta(({ usuario, params, cuerpo }) => editarCliente(usuario, params.id, cuerpo));

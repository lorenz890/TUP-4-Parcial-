import { crearCliente, listarClientes } from "@/servicios/clientes";
import { ruta } from "@/lib/ruta";

// RF-C1, RF-C6, RF-C2, RF-V2
export const GET = ruta(({ usuario, consulta }) =>
  listarClientes(usuario, Object.fromEntries(consulta)),
);

export const POST = ruta(({ usuario, cuerpo }) => crearCliente(usuario, cuerpo), { estado: 201 });

import { obtenerCuenta } from "@/servicios/clientes";
import { ruta } from "@/lib/ruta";

// RF-C4
export const GET = ruta(({ usuario, params, consulta }) =>
  obtenerCuenta(usuario, params.id, Object.fromEntries(consulta)),
);

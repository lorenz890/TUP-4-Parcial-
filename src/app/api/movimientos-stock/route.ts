import { listarMovimientos } from "@/servicios/stock";
import { ruta } from "@/lib/ruta";

// RF-P6: el historial de todos los productos.
export const GET = ruta(({ usuario, consulta }) =>
  listarMovimientos(usuario, Object.fromEntries(consulta)),
);

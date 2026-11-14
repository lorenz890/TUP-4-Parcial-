import { obtenerPago } from "@/servicios/pagos";
import { ruta } from "@/lib/ruta";

// RF-C5: el mismo recibo, para reimprimirlo.
export const GET = ruta(({ usuario, params }) => obtenerPago(usuario, params.id));

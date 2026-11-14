import { obtenerFactura } from "@/servicios/facturas";
import { ruta } from "@/lib/ruta";

// RF-V7
export const GET = ruta(({ usuario, params }) => obtenerFactura(usuario, params.id));

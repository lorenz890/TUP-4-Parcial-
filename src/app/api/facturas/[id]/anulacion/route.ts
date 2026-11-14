import { anularFactura } from "@/servicios/facturas";
import { ruta } from "@/lib/ruta";

// RF-V9: solo administrador; lo verifica el servicio.
export const POST = ruta(({ usuario, params, cuerpo }) => anularFactura(usuario, params.id, cuerpo));

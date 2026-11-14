import { registrarPago } from "@/servicios/pagos";
import { ruta } from "@/lib/ruta";

// RF-C5
export const POST = ruta(({ usuario, params, cuerpo }) => registrarPago(usuario, params.id, cuerpo), {
  estado: 201,
});

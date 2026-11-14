import { listarMovimientos, registrarMovimientoManual } from "@/servicios/stock";
import { ruta } from "@/lib/ruta";

// RF-P6: el historial de un producto. El id de la URL se suma a los filtros.
export const GET = ruta(({ usuario, params, consulta }) =>
  listarMovimientos(usuario, { ...Object.fromEntries(consulta), productoId: params.id }),
);

// RF-P4, RF-P5
export const POST = ruta(({ usuario, params, cuerpo }) => registrarMovimientoManual(usuario, params.id, cuerpo), {
  estado: 201,
});

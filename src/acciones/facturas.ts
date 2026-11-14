"use server";

import { accion } from "@/lib/accion";
import { anularFactura } from "@/servicios/facturas";

// RF-V9. La confirmación de la venta NO es una acción: la pantalla la hace con la API
// REST (POST /api/facturas). La anulación es un formulario corto, así que va por acción.
export const anularFacturaAccion = accion((usuario, entrada: { id: number; datos: unknown }) =>
  anularFactura(usuario, entrada.id, entrada.datos),
);

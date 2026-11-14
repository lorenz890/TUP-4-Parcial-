import { confirmarFactura, listarFacturas } from "@/servicios/facturas";
import { ruta } from "@/lib/ruta";

// RF-V8
export const GET = ruta(({ usuario, consulta }) =>
  listarFacturas(usuario, Object.fromEntries(consulta)),
);

// RF-V1 a RF-V6: una sola llamada que el servicio resuelve en una transacción.
export const POST = ruta(({ usuario, cuerpo }) => confirmarFactura(usuario, cuerpo), { estado: 201 });

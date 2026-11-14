import { proximoNumero } from "@/servicios/facturas";
import { ruta } from "@/lib/ruta";

// RF-V1: solo informativo, el número real se asigna al confirmar.
export const GET = ruta(() => proximoNumero());

import { obtenerTablero } from "@/servicios/tablero";
import { ruta } from "@/lib/ruta";

// RF-T1 a RF-T3: todo lo del inicio en una sola respuesta.
export const GET = ruta(({ usuario }) => obtenerTablero(usuario));

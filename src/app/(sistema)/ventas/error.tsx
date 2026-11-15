"use client";

import { EstadoError } from "@/components/comunes/estado-error";

// Estado de error de Ventas (sección 8). Next lo muestra si algo falla al cargar la pantalla.
export default function ErrorVentas({ reset }: { reset: () => void }) {
  return <EstadoError que="las ventas" reintentar={reset} />;
}

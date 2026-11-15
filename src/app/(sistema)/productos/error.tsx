"use client";

import { EstadoError } from "@/components/comunes/estado-error";

// Estado de error de Productos (sección 8). Next lo muestra si algo falla al cargar la pantalla.
export default function ErrorProductos({ reset }: { reset: () => void }) {
  return <EstadoError que="los productos" reintentar={reset} />;
}

"use client";

import { EstadoError } from "@/components/comunes/estado-error";

// Estado de error de Clientes (sección 8). Next lo muestra si algo falla al cargar la pantalla.
export default function ErrorClientes({ reset }: { reset: () => void }) {
  return <EstadoError que="los clientes" reintentar={reset} />;
}

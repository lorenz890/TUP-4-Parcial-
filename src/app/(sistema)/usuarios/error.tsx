"use client";

import { EstadoError } from "@/components/comunes/estado-error";

// Estado de error de Usuarios (sección 8). Next lo muestra si algo falla al cargar la pantalla.
export default function ErrorUsuarios({ reset }: { reset: () => void }) {
  return <EstadoError que="los usuarios" reintentar={reset} />;
}

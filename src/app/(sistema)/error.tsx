"use client";

import { EstadoError } from "@/components/comunes/estado-error";

// Estado de error del resto de las pantallas del sistema (sección 8): el tablero, el perfil
// y cualquier módulo que no tenga el suyo. Los módulos con listados tienen su propio error.tsx.
export default function ErrorDelSistema({ reset }: { reset: () => void }) {
  return <EstadoError que="esta pantalla" reintentar={reset} />;
}

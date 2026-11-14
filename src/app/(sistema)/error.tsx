"use client";

import { Pila, Texto, Titulo } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";

// Estado de error de todas las pantallas del sistema (sección 8). El detalle
// técnico va al log del servidor; acá solo un mensaje y la opción de reintentar.
export default function ErrorDelSistema({ reset }: { reset: () => void }) {
  return (
    <Pila className="items-center py-16 text-center">
      <Titulo>Algo salió mal</Titulo>
      <Texto className="text-muted-foreground">No pudimos cargar esta pantalla.</Texto>
      <Button onClick={reset}>Reintentar</Button>
    </Pila>
  );
}

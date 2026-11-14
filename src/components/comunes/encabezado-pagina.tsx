import type { ReactNode } from "react";
import { Fila, Pila, Texto, Titulo } from "@/components/maquetacion";

// Encabezado de todas las pantallas: título, una línea de ayuda y, a la derecha,
// los botones de la pantalla (por ejemplo "Nuevo usuario").
export function EncabezadoPagina({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <Fila className="justify-between gap-4">
      <Pila className="gap-1">
        <Titulo>{titulo}</Titulo>
        {descripcion && <Texto className="text-muted-foreground">{descripcion}</Texto>}
      </Pila>
      {children && <Fila>{children}</Fila>}
    </Fila>
  );
}

import type { ReactNode } from "react";
import { Pila, Texto } from "@/components/maquetacion";
import { Label } from "@/components/ui/label";

// Etiqueta + control + mensaje de error junto al campo (sección 8).
// `id` tiene que ser el mismo que lleva el control hijo, para que la etiqueta lo señale.
export function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Pila className="gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error && <Texto className="text-destructive">{error}</Texto>}
    </Pila>
  );
}

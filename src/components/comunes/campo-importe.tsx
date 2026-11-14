"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { centavosATexto, pesosACentavos } from "@/lib/formatos";

// Campo de importe (sección 10.6): la persona escribe pesos como "12.500,50" y el
// formulario recibe centavos enteros (regla 10). Si el texto no es un importe, avisa
// con `undefined` y el esquema de zod muestra el error junto al campo.
export function CampoImporte({
  id,
  valor,
  alCambiar,
  invalido,
}: {
  id: string;
  valor: number | undefined; // centavos
  alCambiar: (centavos: number | undefined) => void;
  invalido?: boolean;
}) {
  // El texto se guarda aparte: mientras se escribe ("12,") todavía no es un importe válido.
  const [texto, setTexto] = useState(valor === undefined ? "" : centavosATexto(valor));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="0,00"
        className="pl-6 text-right"
        value={texto}
        aria-invalid={invalido}
        onChange={(e) => {
          setTexto(e.target.value);
          alCambiar(pesosACentavos(e.target.value) ?? undefined);
        }}
      />
    </div>
  );
}

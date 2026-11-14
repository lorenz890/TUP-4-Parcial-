"use client";

import { Button } from "@/components/ui/button";

// Abre el diálogo de impresión del navegador. Los menús se ocultan solos (print:hidden).
export function BotonImprimir() {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}

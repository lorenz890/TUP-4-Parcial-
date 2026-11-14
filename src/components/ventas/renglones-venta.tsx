"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/formatos";

export type Renglon = {
  productoId: number;
  codigo: string;
  descripcion: string;
  precio: number; // centavos, tal como estaba en el catálogo al buscar
  existencia: number; // lo disponible: la cantidad nunca lo puede superar (RF-V4)
  cantidad: number;
};

// Renglones de la venta (RF-V3): se puede cambiar la cantidad o quitar el renglón.
// El precio y el subtotal que se ven son una ayuda: el servidor vuelve a calcularlos.
export function RenglonesVenta({
  renglones,
  alCambiarCantidad,
  alQuitar,
}: {
  renglones: Renglon[];
  alCambiarCantidad: (productoId: number, cantidad: number) => void;
  alQuitar: (productoId: number) => void;
}) {
  if (renglones.length === 0) {
    return <EstadoVacio mensaje="Buscá un producto y presioná Enter para agregarlo." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descripción</TableHead>
          <TableHead className="text-center">Cantidad</TableHead>
          <TableHead className="text-right">Precio unit.</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {renglones.map((renglon) => (
          <TableRow key={renglon.productoId}>
            <TableCell>
              <Texto className="font-medium">{renglon.descripcion}</Texto>
              <Texto className="text-xs text-muted-foreground">
                <span className="font-mono">{renglon.codigo}</span> · Disponible: {renglon.existencia}
              </Texto>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Una unidad menos"
                  disabled={renglon.cantidad <= 1}
                  onClick={() => alCambiarCantidad(renglon.productoId, renglon.cantidad - 1)}
                >
                  <Minus />
                </Button>
                <Input
                  className="w-14 text-center"
                  inputMode="numeric"
                  aria-label={`Cantidad de ${renglon.descripcion}`}
                  value={renglon.cantidad}
                  onChange={(e) => alCambiarCantidad(renglon.productoId, Number(e.target.value) || 1)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Una unidad más"
                  disabled={renglon.cantidad >= renglon.existencia}
                  onClick={() => alCambiarCantidad(renglon.productoId, renglon.cantidad + 1)}
                >
                  <Plus />
                </Button>
              </div>
            </TableCell>
            <TableCell className="text-right">{formatearMoneda(renglon.precio)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatearMoneda(renglon.precio * renglon.cantidad)}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar ${renglon.descripcion}`}
                onClick={() => alQuitar(renglon.productoId)}
              >
                <Trash2 />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

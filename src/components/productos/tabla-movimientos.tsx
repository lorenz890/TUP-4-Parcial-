import Link from "next/link";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Texto } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearFechaHora } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type Movimiento = {
  id: number;
  producto: { id: number; codigo: string; descripcion: string };
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number;
  existenciaResultante: number;
  motivo: string;
  referencia: { facturaId: number; numero: string } | null;
  usuario: { id: number; nombre: string };
  fecha: string;
};

const nombresDeTipo = { venta: "Venta", anulacion: "Anulación", ingreso: "Ingreso", egreso: "Egreso" };

// Movimientos de stock (RF-P6). `mostrarProducto` agrega la columna del producto,
// que sobra en la ficha de un solo producto.
export function TablaMovimientos({
  movimientos,
  mostrarProducto,
}: {
  movimientos: Movimiento[];
  mostrarProducto: boolean;
}) {
  if (movimientos.length === 0) {
    return <EstadoVacio mensaje="No hay movimientos para mostrar." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          {mostrarProducto && <TableHead>Producto</TableHead>}
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Existencia</TableHead>
          <TableHead>Motivo / referencia</TableHead>
          <TableHead>Usuario</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimientos.map((movimiento) => (
          <TableRow key={movimiento.id}>
            <TableCell className="whitespace-nowrap">{formatearFechaHora(movimiento.fecha)}</TableCell>
            {mostrarProducto && (
              <TableCell>
                <Link href={`/productos/${movimiento.producto.id}`} className="hover:underline">
                  <span className="font-mono text-xs text-muted-foreground">{movimiento.producto.codigo}</span>{" "}
                  {movimiento.producto.descripcion}
                </Link>
              </TableCell>
            )}
            <TableCell>
              <Badge variant="outline">{nombresDeTipo[movimiento.tipo]}</Badge>
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                movimiento.cantidad < 0 ? "text-red-600" : "text-green-600",
              )}
            >
              {movimiento.cantidad > 0 ? `+${movimiento.cantidad}` : movimiento.cantidad}
            </TableCell>
            <TableCell className="text-right">{movimiento.existenciaResultante}</TableCell>
            <TableCell>
              {/* Más adelante (etapa 9) el número de factura va a ser un enlace al comprobante. */}
              {movimiento.referencia ? (
                <Texto>Factura {movimiento.referencia.numero}</Texto>
              ) : (
                movimiento.motivo
              )}
            </TableCell>
            <TableCell>{movimiento.usuario.nombre}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

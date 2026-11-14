import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Fila, Texto } from "@/components/maquetacion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearFechaHora, formatearMoneda } from "@/lib/formatos";

type MovimientoDeCuenta = {
  fecha: string;
  tipo: "debito" | "credito";
  importe: number;
  descripcion: string;
  saldo: number;
};

// RF-C4: movimientos en orden cronológico con el saldo acumulado en cada renglón.
// Débito = el cliente debe más (venta); crédito = debe menos (pago o anulación).
export function TablaCuenta({
  movimientos,
  saldoAnterior,
  saldoAlCierre,
  hayDesde,
}: {
  movimientos: MovimientoDeCuenta[];
  saldoAnterior: number;
  saldoAlCierre: number;
  hayDesde: boolean;
}) {
  if (movimientos.length === 0 && !hayDesde) {
    return <EstadoVacio mensaje="Este cliente todavía no tiene movimientos en su cuenta." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="text-right">Débito</TableHead>
            <TableHead className="text-right">Crédito</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hayDesde && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Saldo anterior al período
              </TableCell>
              <TableCell className="text-right">{formatearMoneda(saldoAnterior)}</TableCell>
            </TableRow>
          )}
          {movimientos.map((movimiento, indice) => (
            <TableRow key={indice}>
              <TableCell className="whitespace-nowrap">{formatearFechaHora(movimiento.fecha)}</TableCell>
              <TableCell>{movimiento.descripcion}</TableCell>
              <TableCell className="text-right">
                {movimiento.tipo === "debito" ? formatearMoneda(movimiento.importe) : ""}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {movimiento.tipo === "credito" ? formatearMoneda(movimiento.importe) : ""}
              </TableCell>
              <TableCell className="text-right">{formatearMoneda(movimiento.saldo)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Fila className="justify-end gap-2">
        <Texto className="text-muted-foreground">Saldo al cierre</Texto>
        <Texto className="font-semibold">{formatearMoneda(saldoAlCierre)}</Texto>
      </Fila>
    </>
  );
}

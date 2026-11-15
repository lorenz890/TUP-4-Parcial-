import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Paginador } from "@/components/comunes/paginador";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { listarClientes } from "@/servicios/clientes";

// RF-C6: clientes con deuda, de mayor a menor, con el total adeudado.
export default async function PaginaSaldos({ searchParams }: PageProps<"/clientes/saldos">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;
  const deudores = await listarClientes(usuario, { ...parametros, conDeuda: "true", orden: "saldo" });

  return (
    <Pila>
      <Link href="/clientes" className="text-sm text-muted-foreground hover:underline">
        ← Clientes
      </Link>
      <EncabezadoPagina titulo="Saldos" descripcion="Clientes con deuda en su cuenta corriente." />

      <Card className="max-w-sm">
        <CardContent>
          <Texto className="text-muted-foreground">Total adeudado</Texto>
          <Texto className="text-2xl font-semibold text-red-600">
            {formatearMoneda(deudores.totalAdeudado ?? 0)}
          </Texto>
        </CardContent>
      </Card>

      {deudores.data.length === 0 ? (
        <EstadoVacio mensaje="Ningún cliente tiene deuda." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deudores.data.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="whitespace-nowrap">
                  <Fila className="flex-nowrap gap-1">
                    <Texto className="text-xs text-muted-foreground">{cliente.tipoDoc}</Texto>
                    <Texto>{cliente.nroDoc}</Texto>
                  </Fila>
                </TableCell>
                <TableCell>
                  <Link href={`/clientes/${cliente.id}?vista=cuenta`} className="font-medium hover:underline">
                    {cliente.nombre}
                  </Link>
                </TableCell>
                <TableCell>{cliente.telefono ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {cliente.disponible === null ? "Sin límite" : formatearMoneda(cliente.disponible)}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatearMoneda(cliente.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        ruta="/clientes/saldos"
        page={deudores.page}
        pageSize={deudores.pageSize}
        total={deudores.total}
        filtros={{}}
      />
    </Pila>
  );
}

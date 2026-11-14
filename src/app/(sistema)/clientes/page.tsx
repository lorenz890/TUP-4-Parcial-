import Link from "next/link";
import { BotonNuevoCliente } from "@/components/clientes/boton-nuevo-cliente";
import { FiltrosClientes } from "@/components/clientes/filtros-clientes";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Paginador } from "@/components/comunes/paginador";
import { Pila } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { listarClientes } from "@/servicios/clientes";

// RF-C1: búsqueda por nombre o documento, con el saldo de cada cliente.
export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;
  const clientes = await listarClientes(usuario, parametros);

  const q = typeof parametros.q === "string" ? parametros.q : "";
  const activo = typeof parametros.activo === "string" ? parametros.activo : "";
  const conDeuda = parametros.conDeuda === "true";

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Clientes"
        descripcion={`${clientes.total} ${clientes.total === 1 ? "cliente" : "clientes"}`}
      >
        <Link href="/clientes/saldos" className={buttonVariants({ variant: "outline" })}>
          Saldos
        </Link>
        <BotonNuevoCliente />
      </EncabezadoPagina>

      <FiltrosClientes q={q} activo={activo} conDeuda={conDeuda} />

      {clientes.data.length === 0 ? (
        <EstadoVacio mensaje="No hay clientes que coincidan con la búsqueda." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Nombre o razón social</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.data.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="text-xs text-muted-foreground">{cliente.tipoDoc}</span> {cliente.nroDoc}
                </TableCell>
                <TableCell>
                  <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                    {cliente.nombre}
                  </Link>
                  {!cliente.activo && (
                    <Badge variant="secondary" className="ml-2">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{cliente.telefono ?? "—"}</TableCell>
                <TableCell>{cliente.cuentaCorriente && <Badge variant="outline">Cta. cte.</Badge>}</TableCell>
                <TableCell className={cn("text-right", cliente.saldo > 0 && "font-medium text-red-600")}>
                  {formatearMoneda(cliente.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        ruta="/clientes"
        page={clientes.page}
        pageSize={clientes.pageSize}
        total={clientes.total}
        filtros={{ q, activo, conDeuda: conDeuda ? "true" : "" }}
      />
    </Pila>
  );
}

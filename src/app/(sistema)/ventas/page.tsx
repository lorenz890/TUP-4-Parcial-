import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Paginador } from "@/components/comunes/paginador";
import { Pila } from "@/components/maquetacion";
import { FiltrosFacturas } from "@/components/ventas/filtros-facturas";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";
import { formatearFechaHora, formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { listarFacturas } from "@/servicios/facturas";
import { listarUsuarios } from "@/servicios/usuarios";

// RF-V8: listado de facturas con filtros y paginado. Lo ven los dos roles.
export default async function PaginaFacturas({ searchParams }: PageProps<"/ventas">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;
  const esAdmin = usuario.rol === "admin";

  const facturas = await listarFacturas(usuario, parametros);
  // El administrador puede filtrar por cualquier vendedor; el vendedor, solo por sí mismo.
  const vendedores = esAdmin
    ? (await listarUsuarios(usuario, { pageSize: 100 })).data.map(({ id, nombre }) => ({ id, nombre }))
    : [{ id: usuario.id, nombre: usuario.nombre }];

  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const filtros = {
    q: texto("q"),
    desde: texto("desde"),
    hasta: texto("hasta"),
    forma: texto("forma"),
    vendedorId: texto("vendedorId"),
    estado: texto("estado"),
  };

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Facturas"
        descripcion={`${facturas.total} ${facturas.total === 1 ? "comprobante" : "comprobantes"} · ${formatearMoneda(facturas.totalEmitido)} emitidos con estos filtros`}
      >
        <Link href="/ventas/nueva" className={buttonVariants()}>
          Nueva venta
        </Link>
      </EncabezadoPagina>

      <FiltrosFacturas {...filtros} vendedores={vendedores} />

      {facturas.data.length === 0 ? (
        <EstadoVacio mensaje="No hay facturas que coincidan con los filtros." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Forma de pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.data.map((factura) => (
              <TableRow key={factura.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/ventas/${factura.id}`} className="hover:underline">
                    {factura.numeroFormateado}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatearFechaHora(factura.fecha)}</TableCell>
                <TableCell className={cn(!factura.cliente && "text-muted-foreground")}>
                  {factura.cliente?.nombre ?? "Consumidor final"}
                </TableCell>
                <TableCell>{factura.vendedor.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline">{NOMBRES_FORMA_DE_PAGO[factura.formaPago]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={factura.estado === "anulada" ? "destructive" : "secondary"}>
                    {factura.estado === "anulada" ? "Anulada" : "Emitida"}
                  </Badge>
                </TableCell>
                <TableCell className={cn("text-right", factura.estado === "anulada" && "line-through")}>
                  {formatearMoneda(factura.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        ruta="/ventas"
        page={facturas.page}
        pageSize={facturas.pageSize}
        total={facturas.total}
        filtros={filtros}
      />
    </Pila>
  );
}

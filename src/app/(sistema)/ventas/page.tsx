import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Paginador } from "@/components/comunes/paginador";
import { Pila, Texto } from "@/components/maquetacion";
import { FiltrosFacturas } from "@/components/ventas/filtros-facturas";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";
import { formatearFechaHora, formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { listarClientes } from "@/servicios/clientes";
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

  // Clientes para el selector (RF-V8), también los dados de baja: sus facturas siguen existiendo.
  // El máximo del paginado es 100, alcanza para un comercio de un solo local.
  const clientes = (await listarClientes(usuario, { activo: "todos", pageSize: 100 })).data.map(
    ({ id, nombre }) => ({ id, nombre }),
  );

  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const filtros = {
    q: texto("q"),
    desde: texto("desde"),
    hasta: texto("hasta"),
    forma: texto("forma"),
    clienteId: texto("clienteId"),
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

      <FiltrosFacturas {...filtros} clientes={clientes} vendedores={vendedores} />

      {facturas.data.length === 0 ? (
        <EstadoVacio mensaje="No hay facturas que coincidan con los filtros." />
      ) : (
        // En el celular (360 px) no entran todas las columnas: Fecha, Cliente, Vendedor y Forma de
        // pago se ocultan debajo de `sm` (el cliente pasa a una segunda línea bajo el número) para
        // que Total y Estado se vean sin deslizar la tabla. El detalle completo está en el comprobante.
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead className="hidden sm:table-cell">Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Vendedor</TableHead>
              <TableHead className="hidden sm:table-cell">Forma de pago</TableHead>
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
                  {/* Solo en el celular: la columna Cliente está oculta y el nombre va debajo del número. */}
                  <Texto className="whitespace-normal font-sans text-xs text-muted-foreground sm:hidden">
                    {factura.cliente?.nombre ?? "Consumidor final"}
                  </Texto>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatearFechaHora(factura.fecha)}</TableCell>
                <TableCell className={cn("hidden sm:table-cell", !factura.cliente && "text-muted-foreground")}>
                  {factura.cliente?.nombre ?? "Consumidor final"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{factura.vendedor.nombre}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{NOMBRES_FORMA_DE_PAGO[factura.formaPago]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={factura.estado === "anulada" ? "destructive" : "secondary"}>
                    {factura.estado === "anulada" ? "Anulada" : "Emitida"}
                  </Badge>
                </TableCell>
                <TableCell className={cn("text-right whitespace-nowrap", factura.estado === "anulada" && "line-through")}>
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

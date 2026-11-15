import Link from "next/link";
import { notFound } from "next/navigation";
import { AccionesCliente } from "@/components/clientes/acciones-cliente";
import { FiltrosCuenta } from "@/components/clientes/filtros-cuenta";
import { TablaCuenta } from "@/components/clientes/tabla-cuenta";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Pestanas } from "@/components/comunes/pestanas";
import { Fila, Grilla, Pila, Texto } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";
import { ApiError } from "@/lib/api-error";
import { formatearFecha, formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { obtenerCliente, obtenerCuenta } from "@/servicios/clientes";

// RF-C3, RF-C4: ficha del cliente con dos pestañas: datos y facturas, y cuenta corriente.
export default async function FichaCliente({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const parametros = await searchParams;

  let cliente;
  try {
    cliente = await obtenerCliente(usuario, id);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "NO_ENCONTRADO" || error.code === "VALIDACION")) notFound();
    throw error;
  }

  const verCuenta = parametros.vista === "cuenta";
  const desde = typeof parametros.desde === "string" ? parametros.desde : "";
  const hasta = typeof parametros.hasta === "string" ? parametros.hasta : "";
  const cuenta = verCuenta ? await obtenerCuenta(usuario, id, { desde: desde || undefined, hasta: hasta || undefined }) : null;

  const datos = [
    { nombre: "Documento", valor: `${cliente.tipoDoc} ${cliente.nroDoc}` },
    { nombre: "Domicilio", valor: cliente.domicilio ?? "—" },
    { nombre: "Teléfono", valor: cliente.telefono ?? "—" },
    { nombre: "Email", valor: cliente.email ?? "—" },
    { nombre: "Cuenta corriente", valor: cliente.cuentaCorriente ? "Habilitada" : "No habilitada" },
  ];

  return (
    <Pila>
      <Link href="/clientes" className="text-sm text-muted-foreground hover:underline">
        ← Clientes
      </Link>

      <EncabezadoPagina titulo={cliente.nombre} descripcion={`${cliente.tipoDoc} ${cliente.nroDoc}`}>
        {!cliente.activo && <Badge variant="secondary">Inactivo</Badge>}
        {cliente.cuentaCorriente && <Badge variant="outline">Cta. cte.</Badge>}
        <AccionesCliente cliente={cliente} />
      </EncabezadoPagina>

      <Grilla className="sm:grid-cols-3">
        <Card>
          <CardContent>
            <Texto className="text-muted-foreground">Saldo actual</Texto>
            <Texto className={cn("text-2xl font-semibold", cliente.saldo > 0 && "text-red-600")}>
              {formatearMoneda(cliente.saldo)}
            </Texto>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Texto className="text-muted-foreground">Límite de crédito</Texto>
            <Texto className="text-2xl font-semibold">
              {cliente.limiteCredito === null ? "Sin límite" : formatearMoneda(cliente.limiteCredito)}
            </Texto>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Texto className="text-muted-foreground">Disponible</Texto>
            <Texto className="text-2xl font-semibold">
              {cliente.disponible === null ? "—" : formatearMoneda(cliente.disponible)}
            </Texto>
          </CardContent>
        </Card>
      </Grilla>

      <Pestanas
        pestanas={[
          { nombre: "Datos y facturas", href: `/clientes/${cliente.id}`, activa: !verCuenta },
          { nombre: "Cuenta corriente", href: `/clientes/${cliente.id}?vista=cuenta`, activa: verCuenta },
        ]}
      />

      {cuenta ? (
        <Pila>
          <FiltrosCuenta idCliente={cliente.id} desde={desde} hasta={hasta} />
          <TablaCuenta
            movimientos={cuenta.movimientos}
            saldoAnterior={cuenta.saldoAnterior}
            saldoAlCierre={cuenta.saldo}
            hayDesde={desde !== ""}
          />
        </Pila>
      ) : (
        <Grilla className="lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <Pila className="gap-2">
                {datos.map(({ nombre, valor }) => (
                  <Fila key={nombre} className="flex-nowrap items-start justify-between gap-4">
                    <Texto className="text-muted-foreground">{nombre}</Texto>
                    <Texto className="text-right">{valor}</Texto>
                  </Fila>
                ))}
              </Pila>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimas facturas</CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.ultimasFacturas.length === 0 ? (
                <EstadoVacio mensaje="Todavía no tiene facturas." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.ultimasFacturas.map((factura) => (
                      <TableRow key={factura.id}>
                        <TableCell className="font-mono text-xs">{factura.numero}</TableCell>
                        <TableCell>{formatearFecha(factura.fecha)}</TableCell>
                        <TableCell>{NOMBRES_FORMA_DE_PAGO[factura.formaPago]}</TableCell>
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
            </CardContent>
          </Card>
        </Grilla>
      )}
    </Pila>
  );
}

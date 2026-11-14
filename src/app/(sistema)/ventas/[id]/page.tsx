import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/comunes/boton-imprimir";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { AccionesFactura } from "@/components/ventas/acciones-factura";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";
import { ApiError } from "@/lib/api-error";
import { COMERCIO } from "@/lib/comercio";
import { formatearFechaHora, formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { obtenerFactura } from "@/servicios/facturas";

// RF-V7: comprobante imprimible (al imprimir se ocultan los menús). RF-V9: un administrador
// puede anular una factura emitida; las anuladas siguen visibles, con su motivo (regla 5).
export default async function ComprobanteFactura({ params }: PageProps<"/ventas/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;

  let factura;
  try {
    factura = await obtenerFactura(usuario, id);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "NO_ENCONTRADO" || error.code === "VALIDACION")) notFound();
    throw error;
  }
  const anulada = factura.estado === "anulada";

  return (
    <Pila>
      <div className="print:hidden">
        <Link href="/ventas" className="text-sm text-muted-foreground hover:underline">
          ← Facturas
        </Link>
      </div>

      <EncabezadoPagina titulo={`Factura ${factura.numeroFormateado}`}>
        <Badge variant={anulada ? "destructive" : "secondary"}>{anulada ? "Anulada" : "Emitida"}</Badge>
        <div className="print:hidden">
          {usuario.rol === "admin" && !anulada && <AccionesFactura factura={factura} />}
        </div>
        <BotonImprimir />
      </EncabezadoPagina>

      <Card className="max-w-3xl">
        <CardContent>
          <Pila className="gap-6">
            <Fila className="items-start justify-between gap-4">
              <Pila className="gap-1">
                <Texto className="text-lg font-semibold">{COMERCIO.nombre}</Texto>
                <Texto className="text-muted-foreground">{COMERCIO.domicilio}</Texto>
                <Texto className="text-muted-foreground">
                  CUIT {COMERCIO.cuit} · Tel. {COMERCIO.telefono}
                </Texto>
              </Pila>
              <Pila className="items-end gap-1">
                <Texto className="font-semibold tracking-widest">FACTURA</Texto>
                <Texto className="font-mono text-lg font-semibold">N° {factura.numeroFormateado}</Texto>
                <Texto className="text-muted-foreground">{formatearFechaHora(factura.fecha)}</Texto>
              </Pila>
            </Fila>

            {anulada && factura.anulacion && (
              <Pila className="gap-0.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <Texto className="font-semibold text-destructive">FACTURA ANULADA</Texto>
                <Texto>Motivo: {factura.anulacion.motivo}</Texto>
                <Texto className="text-muted-foreground">
                  {formatearFechaHora(factura.anulacion.fecha)} · {factura.anulacion.usuario.nombre}
                </Texto>
              </Pila>
            )}

            <Fila className="items-start justify-between gap-4 border-t pt-4">
              <Pila className="gap-0.5">
                <Texto className="text-muted-foreground">Cliente</Texto>
                <Texto className="font-medium">{factura.cliente?.nombre ?? "Consumidor final"}</Texto>
                {factura.cliente && (
                  <Texto className="text-muted-foreground">
                    {factura.cliente.tipoDoc} {factura.cliente.nroDoc}
                    {factura.cliente.domicilio && ` · ${factura.cliente.domicilio}`}
                  </Texto>
                )}
              </Pila>
              <Pila className="gap-0.5">
                <Texto className="text-muted-foreground">Vendedor</Texto>
                <Texto className="font-medium">{factura.vendedor.nombre}</Texto>
              </Pila>
            </Fila>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">P. unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factura.items.map((renglon) => (
                  <TableRow key={renglon.productoId}>
                    <TableCell className="font-mono text-xs">{renglon.codigo}</TableCell>
                    <TableCell>{renglon.descripcion}</TableCell>
                    <TableCell className="text-right">{renglon.cantidad}</TableCell>
                    <TableCell className="text-right">{formatearMoneda(renglon.precioUnitario)}</TableCell>
                    <TableCell className="text-right">{formatearMoneda(renglon.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Fila className="items-end justify-between gap-4">
              <Pila className="gap-0.5">
                <Texto className="text-muted-foreground">Forma de pago</Texto>
                <Texto className="font-medium">{NOMBRES_FORMA_DE_PAGO[factura.pago.forma]}</Texto>
                {factura.pago.forma === "contado" && (
                  <Texto className="text-muted-foreground">
                    Recibido {formatearMoneda(factura.pago.montoRecibido)} · Vuelto{" "}
                    {formatearMoneda(factura.pago.vuelto)}
                  </Texto>
                )}
                {factura.pago.forma === "tarjeta" && (
                  <Texto className="text-muted-foreground">
                    {factura.pago.tarjeta.tipo === "debito" ? "Débito" : "Crédito"} {factura.pago.tarjeta.marca} ····{" "}
                    {factura.pago.tarjeta.ultimos4}
                  </Texto>
                )}
                {factura.saldoCliente !== undefined && (
                  <Texto className="text-muted-foreground">
                    Saldo de la cuenta después de esta factura: {formatearMoneda(factura.saldoCliente)}
                  </Texto>
                )}
              </Pila>
              <Pila className="items-end gap-0">
                <Texto className="text-muted-foreground">Total</Texto>
                <Texto className={cn("text-3xl font-semibold", anulada && "line-through")}>
                  {formatearMoneda(factura.total)}
                </Texto>
              </Pila>
            </Fila>

            <Texto className="border-t pt-4 text-center text-xs text-muted-foreground">
              Comprobante interno sin validez fiscal · Precios finales con impuestos incluidos
            </Texto>
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}

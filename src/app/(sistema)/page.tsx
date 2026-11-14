import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Fila, Grilla, Pila, Texto } from "@/components/maquetacion";
import { GraficoFormasDePago, GraficoVentasDiarias } from "@/components/tablero/graficos";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaDeHoyLarga, formatearMoneda, mesActual } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { listarProductos } from "@/servicios/productos";
import { obtenerTablero } from "@/servicios/tablero";

// RF-T1 a RF-T3: tablero de inicio, para los dos roles. Los números salen del servicio
// obtenerTablero (el mismo de GET /api/tablero); acá solo se muestran.
export default async function Inicio() {
  const usuario = await exigirUsuario();
  const [tablero, paraReponer] = await Promise.all([
    obtenerTablero(usuario),
    listarProductos(usuario, { bajoMinimo: "true", pageSize: 5 }),
  ]);

  const mes = mesActual();
  const hayVentasDiarias = tablero.ventasDiarias.some((dia) => dia.importe > 0);
  const hayVentasDelMes = tablero.porFormaDePago.some((fila) => fila.importe > 0);
  const hayBajoMinimo = tablero.bajoMinimo.cantidad > 0;
  const sumaFacturas = (cantidad: number) => `${cantidad} ${cantidad === 1 ? "factura" : "facturas"}`;

  return (
    <Pila>
      <EncabezadoPagina titulo={`Hola, ${usuario.nombre}`} descripcion={fechaDeHoyLarga()}>
        <Link href="/ventas/nueva" className={buttonVariants()}>
          Nueva venta
        </Link>
      </EncabezadoPagina>

      <Grilla className="sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <Texto className="text-muted-foreground">Ventas de hoy</Texto>
            <Texto className="text-2xl font-semibold">{formatearMoneda(tablero.hoy.importe)}</Texto>
            <Texto className="text-muted-foreground">{sumaFacturas(tablero.hoy.cantidad)}</Texto>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Texto className="text-muted-foreground">Ventas del mes</Texto>
            <Texto className="text-2xl font-semibold">{formatearMoneda(tablero.mes.importe)}</Texto>
            <Texto className="text-muted-foreground">
              {sumaFacturas(tablero.mes.cantidad)} · ticket promedio {formatearMoneda(tablero.mes.ticketPromedio)}
            </Texto>
          </CardContent>
        </Card>
        <Link href="/clientes/saldos">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent>
              <Texto className="text-muted-foreground">Deuda en cuentas corrientes</Texto>
              <Texto className="text-2xl font-semibold">
                {formatearMoneda(tablero.cuentasCorrientes.totalAdeudado)}
              </Texto>
              <Texto className="text-muted-foreground">
                {tablero.cuentasCorrientes.clientesConSaldo}{" "}
                {tablero.cuentasCorrientes.clientesConSaldo === 1 ? "cliente con saldo" : "clientes con saldo"}
              </Texto>
            </CardContent>
          </Card>
        </Link>
        <Link href="/productos?bajoMinimo=true">
          <Card className={cn("h-full transition-colors hover:bg-muted/50", hayBajoMinimo && "bg-amber-50")}>
            <CardContent>
              <Texto className="text-muted-foreground">Bajo stock mínimo</Texto>
              <Texto className="text-2xl font-semibold">{tablero.bajoMinimo.cantidad}</Texto>
              <Texto className="text-muted-foreground">Productos para reponer</Texto>
            </CardContent>
          </Card>
        </Link>
      </Grilla>

      <Grilla className="lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas diarias</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {hayVentasDiarias ? (
              <GraficoVentasDiarias dias={tablero.ventasDiarias} />
            ) : (
              <EstadoVacio mensaje="Todavía no hay ventas en los últimos 30 días." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por forma de pago</CardTitle>
            <CardDescription className="first-letter:uppercase">{mes}</CardDescription>
          </CardHeader>
          <CardContent>
            {hayVentasDelMes ? (
              <GraficoFormasDePago formas={tablero.porFormaDePago} />
            ) : (
              <EstadoVacio mensaje="Todavía no hay ventas este mes." />
            )}
          </CardContent>
        </Card>
      </Grilla>

      <Grilla className="lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Más vendidos del mes</CardTitle>
            <CardDescription>Por unidades</CardDescription>
          </CardHeader>
          <CardContent>
            {tablero.masVendidos.length === 0 ? (
              <EstadoVacio mensaje="Todavía no hay ventas este mes." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tablero.masVendidos.map((producto, posicion) => (
                    <TableRow key={producto.productoId}>
                      <TableCell className="text-muted-foreground">{posicion + 1}</TableCell>
                      <TableCell>
                        <Link href={`/productos/${producto.productoId}`} className="hover:underline">
                          {producto.descripcion}
                        </Link>
                        <Texto className="font-mono text-xs text-muted-foreground">{producto.codigo}</Texto>
                      </TableCell>
                      <TableCell className="text-right">{producto.unidades}</TableCell>
                      <TableCell className="text-right">{formatearMoneda(producto.importe)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Fila className="justify-between">
              <CardTitle>Para reponer</CardTitle>
              <Link href="/productos?bajoMinimo=true" className="text-sm text-muted-foreground hover:underline">
                Ver todos →
              </Link>
            </Fila>
            <CardDescription>Productos bajo el stock mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            {paraReponer.data.length === 0 ? (
              <EstadoVacio mensaje="Ningún producto está bajo el mínimo." />
            ) : (
              <Pila className="gap-3">
                {paraReponer.data.map((producto) => (
                  <Fila key={producto.id} className="justify-between gap-2">
                    <Link href={`/productos/${producto.id}`} className="min-w-0 hover:underline">
                      <Texto className="truncate">{producto.descripcion}</Texto>
                      <Texto className="font-mono text-xs text-muted-foreground">{producto.codigo}</Texto>
                    </Link>
                    <Pila className="items-end gap-0.5">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        {producto.existencia} · bajo mínimo
                      </Badge>
                      <Texto className="text-xs text-muted-foreground">mínimo {producto.stockMinimo}</Texto>
                    </Pila>
                  </Fila>
                ))}
              </Pila>
            )}
          </CardContent>
        </Card>
      </Grilla>
    </Pila>
  );
}

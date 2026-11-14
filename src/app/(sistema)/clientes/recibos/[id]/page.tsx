import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/comunes/boton-imprimir";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Card, CardContent } from "@/components/ui/card";
import { NOMBRES_MEDIO_DE_PAGO } from "@/esquemas/valores";
import { ApiError } from "@/lib/api-error";
import { COMERCIO } from "@/lib/comercio";
import { formatearFechaHora, formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { obtenerCliente } from "@/servicios/clientes";
import { obtenerPago } from "@/servicios/pagos";

// RF-C5: recibo numerado e imprimible. Al imprimir, los menús se ocultan.
export default async function PaginaRecibo({ params }: PageProps<"/clientes/recibos/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;

  let recibo;
  try {
    recibo = await obtenerPago(usuario, id);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "NO_ENCONTRADO" || error.code === "VALIDACION")) notFound();
    throw error;
  }
  const cliente = await obtenerCliente(usuario, recibo.cliente.id);

  const renglones = [
    { nombre: "Concepto", valor: "Pago a cuenta corriente" },
    { nombre: "Medio", valor: NOMBRES_MEDIO_DE_PAGO[recibo.medio] },
    ...(recibo.observacion ? [{ nombre: "Observación", valor: recibo.observacion }] : []),
  ];

  return (
    <Pila>
      <div className="print:hidden">
        <Link href={`/clientes/${cliente.id}?vista=cuenta`} className="text-sm text-muted-foreground hover:underline">
          ← {cliente.nombre}
        </Link>
      </div>
      <EncabezadoPagina titulo={`Recibo ${recibo.numeroRecibo}`}>
        <BotonImprimir />
      </EncabezadoPagina>

      <Card className="max-w-2xl">
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
                <Texto className="font-semibold tracking-widest">RECIBO</Texto>
                <Texto className="font-mono text-lg font-semibold">{recibo.numeroRecibo}</Texto>
                <Texto className="text-muted-foreground">{formatearFechaHora(recibo.fecha)}</Texto>
              </Pila>
            </Fila>

            <Fila className="items-start justify-between gap-4 border-t pt-4">
              <Pila className="gap-0.5">
                <Texto className="text-muted-foreground">Recibimos de</Texto>
                <Texto className="font-medium">{cliente.nombre}</Texto>
                <Texto className="text-muted-foreground">
                  {cliente.tipoDoc} {cliente.nroDoc}
                </Texto>
              </Pila>
              <Pila className="gap-0.5">
                <Texto className="text-muted-foreground">Atendió</Texto>
                <Texto className="font-medium">{recibo.usuario.nombre}</Texto>
              </Pila>
            </Fila>

            <Pila className="gap-2 rounded-lg bg-muted/50 p-4">
              {renglones.map(({ nombre, valor }) => (
                <div key={nombre} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{nombre}</span>
                  <span>{valor}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <span className="font-medium">Importe recibido</span>
                <span className="text-2xl font-semibold">{formatearMoneda(recibo.importe)}</span>
              </div>
            </Pila>

            <Fila className="justify-end gap-2">
              <Texto className="text-muted-foreground">Saldo de la cuenta después de este pago:</Texto>
              <Texto className="font-semibold">{formatearMoneda(recibo.saldoCliente)}</Texto>
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

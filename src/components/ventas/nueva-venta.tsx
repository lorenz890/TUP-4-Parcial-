"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FilaCliente } from "@/components/clientes/dialogo-cliente";
import { ConfirmarAccion } from "@/components/comunes/confirmar-accion";
import { Grilla, Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { esquemaCrearFactura } from "@/esquemas/facturas";
import { formatearMoneda } from "@/lib/formatos";
import { BusquedaProductos, type ProductoBuscado } from "./busqueda-productos";
import { type DatosTarjeta, type FormaDePago, PanelPago } from "./panel-pago";
import { RenglonesVenta, type Renglon } from "./renglones-venta";
import { SeleccionComprador } from "./seleccion-comprador";

// Errores que se muestran pegados a su campo; el resto va en un aviso general.
const erroresEnLinea = ["pago.montoRecibido", "pago.tarjeta.marca", "pago.tarjeta.ultimos4"];

type ErrorDeApi = { code: string; message: string; details?: unknown };

// RF-V1: una sola pantalla con comprador, ítems y forma de pago; el total se recalcula en
// cada cambio. Se opera con el teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar.
// La pantalla NO decide nada de negocio: arma el pedido y lo manda a la API (POST /api/facturas).
// Lo que adelanta (existencia, límite de crédito, monto) es para avisar antes; el servidor
// lo vuelve a verificar y tiene la última palabra.
export function NuevaVenta({ vendedor, proximoNumero }: { vendedor: string; proximoNumero: string }) {
  const router = useRouter();
  const entradaProducto = useRef<HTMLInputElement>(null);
  const entradaCliente = useRef<HTMLInputElement>(null);

  const [cliente, setCliente] = useState<FilaCliente | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [forma, setForma] = useState<FormaDePago>("contado");
  const [montoRecibido, setMontoRecibido] = useState<number | undefined>();
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>({ tipo: "debito", marca: "", ultimos4: "" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  const total = renglones.reduce((suma, renglon) => suma + renglon.precio * renglon.cantidad, 0);
  const unidades = renglones.reduce((suma, renglon) => suma + renglon.cantidad, 0);

  function agregarProducto(producto: ProductoBuscado) {
    setErrores({});
    if (producto.existencia <= 0) {
      toast.error(`${producto.descripcion} no tiene existencia.`);
      return;
    }
    // RF-V3: si el producto ya está, se suma la cantidad al renglón (sin pasar la existencia).
    const existente = renglones.find((renglon) => renglon.productoId === producto.id);
    if (existente) {
      cambiarCantidad(producto.id, existente.cantidad + 1);
      return;
    }
    setRenglones([...renglones, { ...producto, productoId: producto.id, cantidad: 1 }]);
  }

  // RF-V4: la cantidad nunca supera la existencia disponible.
  function cambiarCantidad(productoId: number, cantidad: number) {
    setErrores({});
    const renglon = renglones.find((fila) => fila.productoId === productoId);
    if (!renglon) return;
    if (cantidad > renglon.existencia) toast.error(`Máximo disponible: ${renglon.existencia}.`);
    const permitida = Math.max(1, Math.min(cantidad, renglon.existencia));
    setRenglones(renglones.map((fila) => (fila.productoId === productoId ? { ...fila, cantidad: permitida } : fila)));
  }

  function cambiarCliente(elegido: FilaCliente | null) {
    setErrores({});
    setCliente(elegido);
    // Si ya no hay un cliente con cuenta corriente, esa forma de pago deja de valer.
    if (forma === "cuenta_corriente" && !elegido?.cuentaCorriente) setForma("contado");
  }

  function irAlPago() {
    document.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
  }

  function descartar() {
    setCliente(null);
    setBuscandoCliente(false);
    setRenglones([]);
    setForma("contado");
    setMontoRecibido(undefined);
    setTarjeta({ tipo: "debito", marca: "", ultimos4: "" });
    setErrores({});
    entradaProducto.current?.focus();
  }

  // Errores que devuelve el servidor, repartidos entre los campos y el aviso general.
  function mostrarErrorDelServidor(error: ErrorDeApi) {
    const nuevos: Record<string, string> = {};
    const detalles = Array.isArray(error.details) ? error.details : [];

    if (error.code === "STOCK_INSUFICIENTE") {
      // Se actualiza la existencia de cada renglón con lo que quedó realmente disponible.
      const faltantes: { productoId: number; disponible: number }[] = detalles;
      setRenglones(
        renglones.map((fila) => {
          const faltante = faltantes.find((f) => f.productoId === fila.productoId);
          return faltante ? { ...fila, existencia: faltante.disponible } : fila;
        }),
      );
      nuevos.general = faltantes
        .map((f) => {
          const fila = renglones.find((r) => r.productoId === f.productoId);
          return `${fila?.descripcion ?? "Producto"}: disponible ${f.disponible}.`;
        })
        .join(" ");
      nuevos.general = `No alcanza la existencia. ${nuevos.general}`;
    } else if (error.code === "VALIDACION") {
      for (const detalle of detalles as { campo: string; mensaje: string }[]) {
        nuevos[detalle.campo || "general"] ??= detalle.mensaje;
      }
    } else if (error.code === "MONTO_INSUFICIENTE") {
      nuevos["pago.montoRecibido"] = "El monto recibido no cubre el total.";
    } else {
      nuevos.general = error.message;
    }
    if (Object.keys(nuevos).length === 0) nuevos.general = error.message;
    setErrores(nuevos);
  }

  async function confirmar() {
    if (enviando) return;

    const pago =
      forma === "contado"
        ? { forma, ...(montoRecibido !== undefined && { montoRecibido }) }
        : forma === "tarjeta"
          ? { forma, tarjeta }
          : { forma };
    const pedido = {
      clienteId: cliente?.id ?? null,
      items: renglones.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
      pago,
    };

    // Primero se valida con el MISMO esquema de zod que usa el servidor.
    const revision = esquemaCrearFactura.safeParse(pedido);
    if (!revision.success) {
      const deZod: Record<string, string> = {};
      for (const problema of revision.error.issues) {
        deZod[problema.path.join(".") || "general"] ??= problema.message;
      }
      setErrores(deZod);
      return;
    }
    // Avisos que se pueden dar sin ir al servidor (el servidor los verifica igual).
    if (forma === "contado" && montoRecibido !== undefined && montoRecibido < total) {
      setErrores({ "pago.montoRecibido": "El monto recibido no cubre el total." });
      return;
    }
    if (forma === "cuenta_corriente" && cliente?.limiteCredito != null) {
      const disponible = cliente.limiteCredito - cliente.saldo;
      if (total > disponible) {
        setErrores({ general: `Supera el límite de crédito. Disponible: ${formatearMoneda(disponible)}.` });
        return;
      }
    }

    setEnviando(true);
    setErrores({});
    try {
      const llegada = await fetch("/api/facturas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pedido),
      });
      const cuerpo = await llegada.json();
      if (llegada.ok) {
        toast.success(`Factura ${cuerpo.numeroFormateado} emitida.`);
        router.push(`/ventas/${cuerpo.id}`); // el botón sigue deshabilitado hasta cambiar de pantalla
        return;
      }
      mostrarErrorDelServidor(cuerpo.error);
    } catch {
      setErrores({ general: "No se pudo conectar con el servidor. Probá de nuevo." });
    }
    setEnviando(false);
  }

  // Atajos de teclado. El efecto se arma una sola vez, así que guarda la última `confirmar`.
  const confirmarActual = useRef(confirmar);
  useEffect(() => {
    confirmarActual.current = confirmar;
  });
  useEffect(() => {
    entradaProducto.current?.focus();

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "F2") {
        evento.preventDefault();
        entradaProducto.current?.focus();
      } else if (evento.key === "F4") {
        evento.preventDefault();
        setBuscandoCliente(true);
        setTimeout(() => entradaCliente.current?.focus(), 0);
      } else if (evento.key === "F8") {
        evento.preventDefault();
        irAlPago();
      } else if (evento.key === "F9") {
        evento.preventDefault();
        confirmarActual.current();
      }
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const avisos = [...new Set(Object.entries(errores).filter(([clave]) => !erroresEnLinea.includes(clave)).map(([, mensaje]) => mensaje))];

  return (
    <Grilla className="items-start lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>
            Ítems{" "}
            <span className="text-sm font-normal text-muted-foreground">
              · {renglones.length} {renglones.length === 1 ? "renglón" : "renglones"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Pila>
            <BusquedaProductos entrada={entradaProducto} alElegir={agregarProducto} alPasarAlPago={irAlPago} />
            <RenglonesVenta
              renglones={renglones}
              alCambiarCantidad={cambiarCantidad}
              alQuitar={(productoId) => setRenglones(renglones.filter((fila) => fila.productoId !== productoId))}
            />
          </Pila>
        </CardContent>
      </Card>

      <Pila>
        <Card>
          <CardHeader>
            <CardTitle>Comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <SeleccionComprador
              cliente={cliente}
              buscando={buscandoCliente}
              entrada={entradaCliente}
              alCambiar={cambiarCliente}
              alBuscar={setBuscandoCliente}
            />
          </CardContent>
        </Card>

        {/* El formulario envuelve solo el pago y el resumen: así el Enter de los campos de
            pago confirma la venta, y el modal de cliente (que tiene su propio formulario)
            queda afuera y no puede confirmarla sin querer. */}
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            confirmar();
          }}
        >
          <Pila>
            <Card>
              <CardHeader>
                <CardTitle>Forma de pago</CardTitle>
              </CardHeader>
              <CardContent>
                <PanelPago
                  forma={forma}
                  alCambiarForma={(nueva) => {
                    setErrores({});
                    setForma(nueva);
                  }}
                  montoRecibido={montoRecibido}
                  alCambiarMonto={(centavos) => {
                    setErrores({});
                    setMontoRecibido(centavos);
                  }}
                  tarjeta={tarjeta}
                  alCambiarTarjeta={(nueva) => {
                    setErrores({});
                    setTarjeta(nueva);
                  }}
                  total={total}
                  cliente={cliente}
                  errores={errores}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Pila className="gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unidades</span>
                    <span>{unidades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vendedor</span>
                    <span>{vendedor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Número</span>
                    <span className="font-mono">{proximoNumero} (al confirmar)</span>
                  </div>
                  <div className="flex items-end justify-between border-t pt-3">
                    <span className="font-medium">Total</span>
                    <span className="text-3xl font-semibold">{formatearMoneda(total)}</span>
                  </div>

                  {avisos.map((aviso) => (
                    <Texto key={aviso} className="text-destructive" role="alert">
                      {aviso}
                    </Texto>
                  ))}

                  <Button type="submit" size="lg" disabled={enviando || renglones.length === 0}>
                    {enviando ? "Confirmando..." : "Confirmar factura (F9)"}
                  </Button>
                  <Texto className="text-center text-xs text-muted-foreground">
                    Al confirmar se verifica el stock, se descuenta y se asigna el número.
                  </Texto>
                </Pila>
              </CardContent>
            </Card>
          </Pila>
        </form>

        <Button
          type="button"
          variant="ghost"
          disabled={renglones.length === 0 && cliente === null}
          onClick={() => setDescartando(true)}
        >
          Descartar venta
        </Button>
      </Pila>

      <ConfirmarAccion
        abierto={descartando}
        alCambiar={setDescartando}
        titulo="¿Descartar la venta?"
        descripcion="Se borran los ítems y el comprador elegidos. No se graba nada."
        textoConfirmar="Descartar"
        alConfirmar={descartar}
      />
    </Grilla>
  );
}

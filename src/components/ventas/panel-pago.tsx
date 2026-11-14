"use client";

import { Banknote, CreditCard, Landmark } from "lucide-react";
import type { FilaCliente } from "@/components/clientes/dialogo-cliente";
import { Campo } from "@/components/comunes/campo";
import { CampoImporte } from "@/components/comunes/campo-importe";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FORMAS_DE_PAGO } from "@/esquemas/valores";
import { formatearMoneda } from "@/lib/formatos";
import { cn } from "@/lib/utils";

export type FormaDePago = (typeof FORMAS_DE_PAGO)[number];
export type DatosTarjeta = { tipo: "debito" | "credito"; marca: string; ultimos4: string };

const formas = [
  { valor: "contado", nombre: "Contado", icono: Banknote },
  { valor: "tarjeta", nombre: "Tarjeta", icono: CreditCard },
  { valor: "cuenta_corriente", nombre: "Cta. cte.", icono: Landmark },
] as const;

// Forma de pago de la venta (RF-V5): una sola por factura.
// Contado: el monto recibido y el vuelto. Tarjeta: tipo, marca y últimos 4 dígitos
// (nunca el número completo). Cuenta corriente: solo para un cliente registrado y habilitado.
export function PanelPago({
  forma,
  alCambiarForma,
  montoRecibido,
  alCambiarMonto,
  tarjeta,
  alCambiarTarjeta,
  total,
  cliente,
  errores,
}: {
  forma: FormaDePago;
  alCambiarForma: (forma: FormaDePago) => void;
  montoRecibido: number | undefined;
  alCambiarMonto: (centavos: number | undefined) => void;
  tarjeta: DatosTarjeta;
  alCambiarTarjeta: (tarjeta: DatosTarjeta) => void;
  total: number;
  cliente: FilaCliente | null;
  errores: Record<string, string>;
}) {
  const puedeCuenta = cliente !== null && cliente.cuentaCorriente;
  const cobrado = montoRecibido ?? total;
  const saldoResultante = (cliente?.saldo ?? 0) + total;

  return (
    <Pila className="gap-3">
      <div role="radiogroup" aria-label="Forma de pago" className="flex gap-1 rounded-lg bg-muted p-1">
        {formas.map(({ valor, nombre, icono: Icono }) => (
          <Button
            key={valor}
            id={`forma-${valor}`}
            type="button"
            size="sm"
            role="radio"
            aria-checked={forma === valor}
            variant={forma === valor ? "default" : "ghost"}
            className="flex-1"
            disabled={valor === "cuenta_corriente" && !puedeCuenta}
            onClick={() => alCambiarForma(valor)}
          >
            <Icono /> {nombre}
          </Button>
        ))}
      </div>

      {forma === "contado" && (
        <Pila className="gap-2">
          <Campo id="montoRecibido" etiqueta="Monto recibido" error={errores["pago.montoRecibido"]}>
            <CampoImporte
              id="montoRecibido"
              valor={montoRecibido}
              alCambiar={alCambiarMonto}
              invalido={Boolean(errores["pago.montoRecibido"])}
            />
          </Campo>
          <Fila className="justify-between text-sm">
            <Texto className="text-muted-foreground">
              {montoRecibido === undefined ? "Si lo dejás vacío se cobra el total." : "Vuelto"}
            </Texto>
            <Texto className="font-medium">
              {montoRecibido !== undefined && cobrado >= total ? formatearMoneda(cobrado - total) : "—"}
            </Texto>
          </Fila>
        </Pila>
      )}

      {forma === "tarjeta" && (
        <Pila className="gap-3">
          <Campo id="tipoTarjeta" etiqueta="Tipo">
            <Select
              items={{ debito: "Débito", credito: "Crédito" }}
              value={tarjeta.tipo}
              onValueChange={(tipo) =>
                alCambiarTarjeta({ ...tarjeta, tipo: (tipo ?? "debito") as DatosTarjeta["tipo"] })
              }
            >
              <SelectTrigger id="tipoTarjeta" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="marcaTarjeta" etiqueta="Marca" error={errores["pago.tarjeta.marca"]}>
            <Input
              id="marcaTarjeta"
              placeholder="Visa, Mastercard..."
              value={tarjeta.marca}
              onChange={(e) => alCambiarTarjeta({ ...tarjeta, marca: e.target.value })}
              aria-invalid={Boolean(errores["pago.tarjeta.marca"])}
            />
          </Campo>
          <Campo id="ultimos4" etiqueta="Últimos 4 dígitos" error={errores["pago.tarjeta.ultimos4"]}>
            <Input
              id="ultimos4"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={tarjeta.ultimos4}
              onChange={(e) => alCambiarTarjeta({ ...tarjeta, ultimos4: e.target.value.replace(/\D/g, "") })}
              aria-invalid={Boolean(errores["pago.tarjeta.ultimos4"])}
            />
          </Campo>
          <Texto className="text-xs text-muted-foreground">Nunca se pide ni se guarda el número completo.</Texto>
        </Pila>
      )}

      {forma === "cuenta_corriente" && cliente && (
        <Pila className="gap-1.5 text-sm">
          <Fila className="justify-between">
            <Texto className="text-muted-foreground">Saldo actual</Texto>
            <Texto>{formatearMoneda(cliente.saldo)}</Texto>
          </Fila>
          <Fila className="justify-between">
            <Texto className="text-muted-foreground">Esta factura</Texto>
            <Texto>+ {formatearMoneda(total)}</Texto>
          </Fila>
          <Fila className="justify-between border-t pt-1.5">
            <Texto className="font-medium">Saldo resultante</Texto>
            <Texto className="font-medium">{formatearMoneda(saldoResultante)}</Texto>
          </Fila>
          <Fila className="justify-between">
            <Texto className="text-muted-foreground">Límite de crédito</Texto>
            <Texto className={cn(cliente.limiteCredito !== null && saldoResultante > cliente.limiteCredito && "text-red-600")}>
              {cliente.limiteCredito === null ? "Sin límite" : formatearMoneda(cliente.limiteCredito)}
            </Texto>
          </Fila>
        </Pila>
      )}

      {!puedeCuenta && (
        <Texto className="text-xs text-muted-foreground">
          Para vender a cuenta corriente elegí un cliente registrado con la cuenta habilitada.
        </Texto>
      )}
    </Pila>
  );
}

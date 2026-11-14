"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registrarPagoAccion } from "@/acciones/clientes";
import { Campo } from "@/components/comunes/campo";
import { CampoImporte } from "@/components/comunes/campo-importe";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { esquemaRegistrarPago } from "@/esquemas/pagos";
import { MEDIOS_DE_PAGO, NOMBRES_MEDIO_DE_PAGO } from "@/esquemas/valores";
import { useFormulario } from "@/hooks/use-formulario";
import { formatearMoneda } from "@/lib/formatos";

// RF-C5: registrar un pago a cuenta. El servidor rechaza un importe mayor a la deuda.
export function DialogoPago({
  abierto,
  alCambiar,
  cliente,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  cliente: { id: number; nombre: string; saldo: number };
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {cliente.nombre} · saldo adeudado {formatearMoneda(cliente.saldo)}
          </DialogDescription>
        </DialogHeader>
        <FormularioPago cliente={cliente} alTerminar={() => alCambiar(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioPago({
  cliente,
  alTerminar,
}: {
  cliente: { id: number; saldo: number };
  alTerminar: () => void;
}) {
  const router = useRouter();

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esquemaRegistrarPago,
    valoresIniciales: {
      importe: undefined as number | undefined, // centavos
      medio: "efectivo" as string,
      observacion: "",
    },
    enviar: (datos) => registrarPagoAccion({ id: cliente.id, datos }),
    alExito: (recibo) => {
      toast.success(`Pago registrado: recibo ${recibo.numeroRecibo}.`);
      alTerminar();
      router.push(`/clientes/recibos/${recibo.id}`); // el recibo se puede imprimir
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="importe" etiqueta="Importe" error={errores.importe}>
          <CampoImporte
            id="importe"
            valor={valores.importe}
            alCambiar={(centavos) => cambiar("importe", centavos)}
            invalido={Boolean(errores.importe)}
          />
        </Campo>
        <Fila>
          <Button type="button" variant="outline" size="sm" onClick={() => cambiar("importe", cliente.saldo)}>
            Saldo total
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cambiar("importe", Math.floor(cliente.saldo / 2))}
          >
            La mitad
          </Button>
        </Fila>

        <Campo id="medio" etiqueta="Medio de pago" error={errores.medio}>
          <Select
            items={NOMBRES_MEDIO_DE_PAGO}
            value={valores.medio}
            onValueChange={(medio) => cambiar("medio", medio ?? "efectivo")}
          >
            <SelectTrigger id="medio" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIOS_DE_PAGO.map((medio) => (
                <SelectItem key={medio} value={medio}>
                  {NOMBRES_MEDIO_DE_PAGO[medio]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id="observacion" etiqueta="Observación (opcional)" error={errores.observacion}>
          <Input
            id="observacion"
            value={valores.observacion}
            onChange={(e) => cambiar("observacion", e.target.value)}
          />
        </Campo>

        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Registrar pago"}
        </Button>
      </Pila>
    </form>
  );
}

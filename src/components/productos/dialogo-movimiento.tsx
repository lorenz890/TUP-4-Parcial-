"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registrarMovimientoAccion } from "@/acciones/productos";
import { Campo } from "@/components/comunes/campo";
import { Pila, Texto } from "@/components/maquetacion";
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
import { esquemaMovimientoManual } from "@/esquemas/stock";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO } from "@/esquemas/valores";
import { useFormulario } from "@/hooks/use-formulario";

type Tipo = "ingreso" | "egreso";

// Ingreso o egreso manual de stock de un producto (RF-P4, RF-P5).
export function DialogoMovimiento({
  tipo,
  producto,
  alCerrar,
}: {
  tipo: Tipo | null; // null = cerrado
  producto: { id: number; descripcion: string };
  alCerrar: () => void;
}) {
  return (
    <Dialog open={tipo !== null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipo === "egreso" ? "Egreso de stock" : "Ingreso de stock"}</DialogTitle>
          <DialogDescription>
            {producto.descripcion}.{" "}
            {tipo === "egreso"
              ? "Resta unidades: no puede dejar la existencia en negativo."
              : "Suma unidades a la existencia."}
          </DialogDescription>
        </DialogHeader>
        {/* `key` y la montura condicional reinician el formulario cada vez que se abre. */}
        {tipo && <FormularioMovimiento key={tipo} tipo={tipo} idProducto={producto.id} alTerminar={alCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioMovimiento({
  tipo,
  idProducto,
  alTerminar,
}: {
  tipo: Tipo;
  idProducto: number;
  alTerminar: () => void;
}) {
  const router = useRouter();
  const motivos: readonly string[] = tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esquemaMovimientoManual,
    valoresIniciales: { tipo, cantidad: "1", motivo: motivos[0], observacion: "" },
    enviar: (datos) => registrarMovimientoAccion({ id: idProducto, datos }),
    alExito: (movimiento) => {
      toast.success(`Movimiento registrado. Existencia: ${movimiento.existenciaResultante}.`);
      alTerminar();
      router.refresh();
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="cantidad" etiqueta="Cantidad" error={errores.cantidad}>
          <Input
            id="cantidad"
            inputMode="numeric"
            autoFocus
            value={valores.cantidad}
            onChange={(e) => cambiar("cantidad", e.target.value)}
            aria-invalid={Boolean(errores.cantidad)}
          />
        </Campo>
        <Campo id="motivo" etiqueta="Motivo" error={errores.motivo}>
          <Select
            items={Object.fromEntries(motivos.map((motivo) => [motivo, motivo]))}
            value={valores.motivo}
            onValueChange={(motivo) => cambiar("motivo", motivo ?? "")}
          >
            <SelectTrigger id="motivo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {motivos.map((motivo) => (
                <SelectItem key={motivo} value={motivo}>
                  {motivo}
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
          {enviando ? "Guardando..." : tipo === "egreso" ? "Registrar egreso" : "Registrar ingreso"}
        </Button>
      </Pila>
    </form>
  );
}

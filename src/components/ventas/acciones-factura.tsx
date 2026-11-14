"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { anularFacturaAccion } from "@/acciones/facturas";
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
import { Textarea } from "@/components/ui/textarea";
import { esquemaAnularFactura } from "@/esquemas/facturas";
import { useFormulario } from "@/hooks/use-formulario";

// Botón "Anular" del comprobante (RF-V9). Solo se muestra al administrador y si la factura
// está emitida: es una ayuda visual, el permiso real lo verifica el servicio (403).
export function AccionesFactura({
  factura,
}: {
  factura: { id: number; numeroFormateado: string };
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setAbierto(true)}>
        Anular
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular la factura {factura.numeroFormateado}</DialogTitle>
            <DialogDescription>
              Se reingresa el stock y, si fue a cuenta corriente, se registra un crédito por el total.
              La factura queda visible como anulada y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {/* El formulario vive adentro para que su estado empiece de cero cada vez que se abre. */}
          <FormularioAnulacion idFactura={factura.id} alTerminar={() => setAbierto(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormularioAnulacion({ idFactura, alTerminar }: { idFactura: number; alTerminar: () => void }) {
  const router = useRouter();

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esquemaAnularFactura,
    valoresIniciales: { motivo: "" },
    enviar: (datos) => anularFacturaAccion({ id: idFactura, datos }),
    alExito: (anulada) => {
      toast.success(`Factura ${anulada.numeroFormateado} anulada.`);
      alTerminar();
      router.refresh();
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="motivo" etiqueta="Motivo (obligatorio)" error={errores.motivo}>
          <Textarea
            id="motivo"
            rows={3}
            autoFocus
            value={valores.motivo}
            onChange={(e) => cambiar("motivo", e.target.value)}
            aria-invalid={Boolean(errores.motivo)}
          />
        </Campo>
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Anulando..." : "Anular factura"}
        </Button>
      </Pila>
    </form>
  );
}

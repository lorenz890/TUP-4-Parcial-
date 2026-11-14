"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearClienteAccion, editarClienteAccion } from "@/acciones/clientes";
import { Campo } from "@/components/comunes/campo";
import { CampoImporte } from "@/components/comunes/campo-importe";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { esquemaCrearCliente, esquemaEditarCliente } from "@/esquemas/clientes";
import type { TIPOS_DOCUMENTO } from "@/esquemas/valores";
import { useFormulario } from "@/hooks/use-formulario";

export type FilaCliente = {
  id: number;
  tipoDoc: (typeof TIPOS_DOCUMENTO)[number];
  nroDoc: string;
  nombre: string;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  saldo: number;
  disponible: number | null;
  activo: boolean;
};

// Alta (sin `cliente`) y edición (con `cliente`) en el mismo diálogo.
export function DialogoCliente({
  abierto,
  alCambiar,
  cliente,
  alCrear,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  cliente?: FilaCliente;
  // Si se pasa, se llama con el cliente recién creado. Lo usa Nueva venta: el alta rápida
  // no recarga la pantalla, así la venta en curso no se pierde.
  alCrear?: (cliente: FilaCliente) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Para vender a cuenta corriente, el cliente tiene que estar habilitado.
          </DialogDescription>
        </DialogHeader>
        {/* El formulario vive adentro para que su estado empiece de cero cada vez que se abre. */}
        <FormularioCliente cliente={cliente} alCrear={alCrear} alTerminar={() => alCambiar(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioCliente({
  cliente,
  alCrear,
  alTerminar,
}: {
  cliente?: FilaCliente;
  alCrear?: (cliente: FilaCliente) => void;
  alTerminar: () => void;
}) {
  const router = useRouter();

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: cliente ? esquemaEditarCliente : esquemaCrearCliente,
    valoresIniciales: {
      tipoDoc: cliente?.tipoDoc ?? ("DNI" as FilaCliente["tipoDoc"]),
      nroDoc: cliente?.nroDoc ?? "",
      nombre: cliente?.nombre ?? "",
      domicilio: cliente?.domicilio ?? "",
      telefono: cliente?.telefono ?? "",
      email: cliente?.email ?? "",
      cuentaCorriente: cliente?.cuentaCorriente ?? false,
      limiteCredito: (cliente?.limiteCredito ?? null) as number | null, // centavos; nulo = sin límite
    },
    enviar: (datos) =>
      cliente ? editarClienteAccion({ id: cliente.id, datos }) : crearClienteAccion(datos),
    alExito: (guardado) => {
      toast.success(cliente ? "Cliente actualizado." : "Cliente creado.");
      alTerminar();
      if (alCrear) alCrear(guardado);
      else router.refresh();
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Fila className="items-start gap-4 [&>*:first-child]:w-32 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1">
          <Campo id="tipoDoc" etiqueta="Documento" error={undefined}>
            <Select
              items={{ DNI: "DNI", CUIT: "CUIT" }}
              value={valores.tipoDoc}
              onValueChange={(tipo) => cambiar("tipoDoc", (tipo ?? "DNI") as FilaCliente["tipoDoc"])}
            >
              <SelectTrigger id="tipoDoc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="CUIT">CUIT</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="nroDoc" etiqueta="Número" error={errores.nroDoc ?? errores.tipoDoc}>
            <Input
              id="nroDoc"
              inputMode="numeric"
              value={valores.nroDoc}
              onChange={(e) => cambiar("nroDoc", e.target.value)}
              aria-invalid={Boolean(errores.nroDoc)}
            />
          </Campo>
        </Fila>

        <Campo id="nombre" etiqueta="Nombre o razón social" error={errores.nombre}>
          <Input
            id="nombre"
            value={valores.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
          />
        </Campo>

        <Campo id="domicilio" etiqueta="Domicilio (opcional)" error={errores.domicilio}>
          <Input
            id="domicilio"
            value={valores.domicilio}
            onChange={(e) => cambiar("domicilio", e.target.value)}
          />
        </Campo>

        <Fila className="items-start gap-4 [&>*]:min-w-0 [&>*]:flex-1">
          <Campo id="telefono" etiqueta="Teléfono (opcional)" error={errores.telefono}>
            <Input
              id="telefono"
              value={valores.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
            />
          </Campo>
          <Campo id="email" etiqueta="Email (opcional)" error={errores.email}>
            <Input
              id="email"
              type="email"
              value={valores.email}
              onChange={(e) => cambiar("email", e.target.value)}
              aria-invalid={Boolean(errores.email)}
            />
          </Campo>
        </Fila>

        <Fila className="gap-2">
          <Checkbox
            id="cuentaCorriente"
            checked={valores.cuentaCorriente}
            onCheckedChange={(marcado) => {
              cambiar("cuentaCorriente", marcado);
              if (!marcado) cambiar("limiteCredito", null); // sin cuenta no hay límite
            }}
          />
          <Label htmlFor="cuentaCorriente">Habilitado para cuenta corriente</Label>
        </Fila>

        {valores.cuentaCorriente && (
          <Campo id="limiteCredito" etiqueta="Límite de crédito (opcional)" error={errores.limiteCredito}>
            <CampoImporte
              id="limiteCredito"
              valor={valores.limiteCredito ?? undefined}
              alCambiar={(centavos) => cambiar("limiteCredito", centavos ?? null)}
              invalido={Boolean(errores.limiteCredito)}
            />
          </Campo>
        )}

        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
      </Pila>
    </form>
  );
}

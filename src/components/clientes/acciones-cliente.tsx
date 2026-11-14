"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { editarClienteAccion } from "@/acciones/clientes";
import { ConfirmarAccion } from "@/components/comunes/confirmar-accion";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { DialogoCliente, type FilaCliente } from "./dialogo-cliente";
import { DialogoPago } from "./dialogo-pago";

// Botones de la ficha del cliente. Los dos roles pueden usarlos (sección 3).
export function AccionesCliente({ cliente }: { cliente: FilaCliente }) {
  const router = useRouter();
  const [pagando, setPagando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  async function cambiarActivo() {
    const resultado = await editarClienteAccion({
      id: cliente.id,
      datos: { activo: !cliente.activo },
    });
    // Si tiene saldo, el servicio responde SALDO_PENDIENTE y se muestra su mensaje.
    if (!resultado.ok) return toast.error(resultado.error.message);

    toast.success(cliente.activo ? "Cliente dado de baja." : "Cliente reactivado.");
    router.refresh();
  }

  return (
    <>
      <Fila>
        {cliente.cuentaCorriente && (
          <Button onClick={() => setPagando(true)} disabled={cliente.saldo <= 0}>
            Registrar pago
          </Button>
        )}
        <Button variant="outline" onClick={() => setEditando(true)}>
          Editar
        </Button>
        {cliente.activo ? (
          <Button variant="destructive" onClick={() => setConfirmandoBaja(true)}>
            Dar de baja
          </Button>
        ) : (
          <Button variant="outline" onClick={cambiarActivo}>
            Reactivar
          </Button>
        )}
      </Fila>

      <DialogoPago abierto={pagando} alCambiar={setPagando} cliente={cliente} />
      <DialogoCliente abierto={editando} alCambiar={setEditando} cliente={cliente} />
      <ConfirmarAccion
        abierto={confirmandoBaja}
        alCambiar={setConfirmandoBaja}
        titulo="¿Dar de baja el cliente?"
        descripcion={`${cliente.nombre} deja de ofrecerse en las ventas. Conserva su historial y se puede reactivar. Solo se puede si su saldo es cero.`}
        textoConfirmar="Dar de baja"
        alConfirmar={cambiarActivo}
      />
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { editarProductoAccion } from "@/acciones/productos";
import { ConfirmarAccion } from "@/components/comunes/confirmar-accion";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { DialogoMovimiento } from "./dialogo-movimiento";
import { type Categoria, DialogoProducto, type FilaProducto } from "./dialogo-producto";

// Botones de la ficha del producto. Solo se muestran al administrador: es una ayuda
// visual, el permiso real lo verifican los servicios.
export function AccionesProducto({
  producto,
  categorias,
}: {
  producto: FilaProducto;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [movimiento, setMovimiento] = useState<"ingreso" | "egreso" | null>(null);
  const [editando, setEditando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  async function cambiarActivo() {
    const resultado = await editarProductoAccion({
      id: producto.id,
      datos: { activo: !producto.activo },
    });
    if (!resultado.ok) return toast.error(resultado.error.message);

    toast.success(producto.activo ? "Producto dado de baja." : "Producto reactivado.");
    router.refresh();
  }

  return (
    <>
      <Fila>
        <Button variant="outline" onClick={() => setMovimiento("ingreso")}>
          Ingreso
        </Button>
        <Button variant="outline" onClick={() => setMovimiento("egreso")}>
          Egreso
        </Button>
        <Button variant="outline" onClick={() => setEditando(true)}>
          Editar
        </Button>
        {producto.activo ? (
          <Button variant="destructive" onClick={() => setConfirmandoBaja(true)}>
            Dar de baja
          </Button>
        ) : (
          <Button variant="outline" onClick={cambiarActivo}>
            Reactivar
          </Button>
        )}
      </Fila>

      <DialogoMovimiento
        tipo={movimiento}
        producto={producto}
        alCerrar={() => setMovimiento(null)}
      />
      <DialogoProducto
        abierto={editando}
        alCambiar={setEditando}
        categorias={categorias}
        producto={producto}
      />
      <ConfirmarAccion
        abierto={confirmandoBaja}
        alCambiar={setConfirmandoBaja}
        titulo="¿Dar de baja el producto?"
        descripcion={`${producto.descripcion} deja de ofrecerse en las ventas. Conserva su historial y se puede reactivar.`}
        textoConfirmar="Dar de baja"
        alConfirmar={cambiarActivo}
      />
    </>
  );
}

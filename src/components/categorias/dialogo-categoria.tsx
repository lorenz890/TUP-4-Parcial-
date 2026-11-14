"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCategoriaAccion, editarCategoriaAccion } from "@/acciones/categorias";
import { Campo } from "@/components/comunes/campo";
import { Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { esquemaCrearCategoria } from "@/esquemas/categorias";
import { useFormulario } from "@/hooks/use-formulario";

export type FilaCategoria = {
  id: number;
  nombre: string;
  activa: boolean;
  productosActivos: number;
};

// Alta (sin `categoria`) y edición (con `categoria`) en el mismo diálogo.
export function DialogoCategoria({
  abierto,
  alCambiar,
  categoria,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  categoria?: FilaCategoria;
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <FormularioCategoria categoria={categoria} alTerminar={() => alCambiar(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioCategoria({
  categoria,
  alTerminar,
}: {
  categoria?: FilaCategoria;
  alTerminar: () => void;
}) {
  const router = useRouter();

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    // Alta y edición aceptan solo el nombre desde este formulario.
    esquema: esquemaCrearCategoria,
    valoresIniciales: { nombre: categoria?.nombre ?? "" },
    enviar: (datos) =>
      categoria ? editarCategoriaAccion({ id: categoria.id, datos }) : crearCategoriaAccion(datos),
    alExito: () => {
      toast.success(categoria ? "Categoría actualizada." : "Categoría creada.");
      alTerminar();
      router.refresh();
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input
            id="nombre"
            autoFocus
            value={valores.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
          />
        </Campo>
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
      </Pila>
    </form>
  );
}

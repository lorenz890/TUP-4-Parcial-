"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { editarCategoriaAccion } from "@/acciones/categorias";
import { ConfirmarAccion } from "@/components/comunes/confirmar-accion";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Fila } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogoCategoria, type FilaCategoria } from "./dialogo-categoria";

// Lista de categorías. Los botones de edición solo se muestran al administrador:
// es una ayuda visual, el permiso real lo verifican los servicios.
export function ListaCategorias({
  categorias,
  esAdmin,
}: {
  categorias: FilaCategoria[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [aEditar, setAEditar] = useState<FilaCategoria | null>(null);
  const [aDesactivar, setADesactivar] = useState<FilaCategoria | null>(null);

  async function cambiarActiva(categoria: FilaCategoria) {
    const resultado = await editarCategoriaAccion({
      id: categoria.id,
      datos: { activa: !categoria.activa },
    });
    if (!resultado.ok) return toast.error(resultado.error.message);

    toast.success(categoria.activa ? "Categoría desactivada." : "Categoría activada.");
    router.refresh();
  }

  if (categorias.length === 0) {
    return <EstadoVacio mensaje="Todavía no hay categorías." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Productos activos</TableHead>
            <TableHead>Estado</TableHead>
            {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell className="font-medium">{categoria.nombre}</TableCell>
              <TableCell className="text-right">{categoria.productosActivos}</TableCell>
              <TableCell>
                <Badge variant={categoria.activa ? "default" : "secondary"}>
                  {categoria.activa ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              {esAdmin && (
                <TableCell>
                  <Fila className="justify-end">
                    <Button variant="outline" size="sm" onClick={() => setAEditar(categoria)}>
                      Editar
                    </Button>
                    {categoria.activa ? (
                      <Button variant="destructive" size="sm" onClick={() => setADesactivar(categoria)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => cambiarActiva(categoria)}>
                        Activar
                      </Button>
                    )}
                  </Fila>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* `key` fuerza un formulario nuevo para cada categoría que se edita. */}
      <DialogoCategoria
        key={aEditar?.id}
        abierto={aEditar !== null}
        alCambiar={(abierto) => !abierto && setAEditar(null)}
        categoria={aEditar ?? undefined}
      />

      <ConfirmarAccion
        abierto={aDesactivar !== null}
        alCambiar={(abierto) => !abierto && setADesactivar(null)}
        titulo="¿Desactivar categoría?"
        descripcion={`${aDesactivar?.nombre ?? ""} deja de ofrecerse al crear productos. Solo se puede si no tiene productos activos.`}
        textoConfirmar="Desactivar"
        alConfirmar={() => aDesactivar && cambiarActiva(aDesactivar)}
      />
    </>
  );
}

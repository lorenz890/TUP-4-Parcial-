"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearProductoAccion, editarProductoAccion } from "@/acciones/productos";
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
import { esquemaCrearProducto, esquemaEditarProducto } from "@/esquemas/productos";
import { useFormulario } from "@/hooks/use-formulario";

export type Categoria = { id: number; nombre: string };

export type FilaProducto = {
  id: number;
  codigo: string;
  descripcion: string;
  categoria: Categoria;
  precio: number;
  existencia: number;
  stockMinimo: number;
  bajoMinimo: boolean;
  activo: boolean;
};

// Alta (sin `producto`) y edición (con `producto`) en el mismo diálogo.
export function DialogoProducto({
  abierto,
  alCambiar,
  categorias,
  producto,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  categorias: Categoria[];
  producto?: FilaProducto;
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {producto
              ? "La existencia no se edita acá: se cambia con un ingreso o un egreso."
              : "El stock inicial se registra como un movimiento de ingreso."}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario vive adentro para que su estado empiece de cero cada vez que se abre. */}
        <FormularioProducto
          producto={producto}
          categorias={categorias}
          alTerminar={() => alCambiar(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioProducto({
  producto,
  categorias,
  alTerminar,
}: {
  producto?: FilaProducto;
  categorias: Categoria[];
  alTerminar: () => void;
}) {
  const router = useRouter();
  const esEdicion = producto !== undefined;
  const nombresDeCategoria = Object.fromEntries(categorias.map((c) => [String(c.id), c.nombre]));

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esEdicion ? esquemaEditarProducto : esquemaCrearProducto,
    valoresIniciales: {
      codigo: producto?.codigo ?? "",
      descripcion: producto?.descripcion ?? "",
      categoriaId: producto ? String(producto.categoria.id) : "",
      precio: producto?.precio as number | undefined, // centavos
      stockMinimo: String(producto?.stockMinimo ?? 0),
      stockInicial: esEdicion ? undefined : "0",
    },
    enviar: (datos) =>
      esEdicion ? editarProductoAccion({ id: producto.id, datos }) : crearProductoAccion(datos),
    alExito: () => {
      toast.success(esEdicion ? "Producto actualizado." : "Producto creado.");
      alTerminar();
      router.refresh(); // vuelve a pedir los datos
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Fila className="items-start gap-4 [&>*]:min-w-0 [&>*]:flex-1">
          <Campo id="codigo" etiqueta="Código" error={errores.codigo}>
            <Input
              id="codigo"
              className="font-mono"
              placeholder="HE-010"
              value={valores.codigo}
              onChange={(e) => cambiar("codigo", e.target.value)}
              aria-invalid={Boolean(errores.codigo)}
            />
          </Campo>
          <Campo id="categoriaId" etiqueta="Categoría" error={errores.categoriaId}>
            <Select
              items={nombresDeCategoria}
              value={valores.categoriaId || null}
              onValueChange={(id) => cambiar("categoriaId", id ?? "")}
            >
              <SelectTrigger id="categoriaId" className="w-full" aria-invalid={Boolean(errores.categoriaId)}>
                <SelectValue placeholder="Elegí una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={String(categoria.id)}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </Fila>

        <Campo id="descripcion" etiqueta="Descripción" error={errores.descripcion}>
          <Input
            id="descripcion"
            value={valores.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
            aria-invalid={Boolean(errores.descripcion)}
          />
        </Campo>

        <Fila className="items-start gap-4 [&>*]:min-w-0 [&>*]:flex-1">
          <Campo id="precio" etiqueta="Precio de venta" error={errores.precio}>
            <CampoImporte
              id="precio"
              valor={valores.precio}
              alCambiar={(centavos) => cambiar("precio", centavos)}
              invalido={Boolean(errores.precio)}
            />
          </Campo>
          <Campo id="stockMinimo" etiqueta="Stock mínimo" error={errores.stockMinimo}>
            <Input
              id="stockMinimo"
              inputMode="numeric"
              value={valores.stockMinimo}
              onChange={(e) => cambiar("stockMinimo", e.target.value)}
              aria-invalid={Boolean(errores.stockMinimo)}
            />
          </Campo>
        </Fila>
        <Texto className="-mt-2 text-xs text-muted-foreground">Final, con impuestos incluidos.</Texto>

        {!esEdicion && (
          <Campo id="stockInicial" etiqueta="Stock inicial (opcional)" error={errores.stockInicial}>
            <Input
              id="stockInicial"
              inputMode="numeric"
              value={valores.stockInicial ?? ""}
              onChange={(e) => cambiar("stockInicial", e.target.value)}
              aria-invalid={Boolean(errores.stockInicial)}
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

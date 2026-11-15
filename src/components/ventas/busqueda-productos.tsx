"use client";

import { useState, type KeyboardEvent, type Ref } from "react";
import { Input } from "@/components/ui/input";
import { useBusqueda } from "@/hooks/use-busqueda";
import { formatearMoneda } from "@/lib/formatos";
import { cn } from "@/lib/utils";

export type ProductoBuscado = {
  id: number;
  codigo: string;
  descripcion: string;
  precio: number; // centavos
  existencia: number;
};

// Buscador de productos de la venta (RF-V3), operable solo con el teclado:
// escribís, ↑ ↓ eligen, Enter agrega. Con el cuadro vacío, Enter pasa al pago.
export function BusquedaProductos({
  entrada,
  alElegir,
  alPasarAlPago,
}: {
  entrada: Ref<HTMLInputElement>;
  alElegir: (producto: ProductoBuscado) => void;
  alPasarAlPago: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const { filas, actualizada, error } = useBusqueda<ProductoBuscado>("/api/productos", texto);

  function elegir(producto: ProductoBuscado) {
    alElegir(producto);
    setTexto("");
    setIndice(0);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && filas.length > 0) {
      evento.preventDefault();
      setIndice(Math.min(indice + 1, filas.length - 1));
    } else if (evento.key === "ArrowUp" && filas.length > 0) {
      evento.preventDefault();
      setIndice(Math.max(indice - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault(); // que no envíe el formulario de la venta
      if (texto.trim() === "") alPasarAlPago();
      else if (actualizada && filas[indice]) elegir(filas[indice]);
    } else if (evento.key === "Escape") {
      setTexto("");
    }
  }

  return (
    <div className="relative">
      <Input
        ref={entrada}
        value={texto}
        placeholder="Código o descripción del producto (F2)"
        aria-label="Buscar producto"
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value);
          setIndice(0);
        }}
        onKeyDown={alTeclear}
      />
      {texto.trim() !== "" && filas.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md"
        >
          {filas.map((producto, posicion) => (
            <li
              key={producto.id}
              role="option"
              aria-selected={posicion === indice}
              // onMouseDown y no onClick: el cuadro de búsqueda no pierde el foco.
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(producto);
              }}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                posicion === indice && "bg-muted",
              )}
            >
              <span>
                <span className="font-mono text-xs text-muted-foreground">{producto.codigo}</span>{" "}
                {producto.descripcion}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={producto.existencia > 0 ? "text-muted-foreground" : "text-red-600"}>
                  {producto.existencia > 0 ? `Disponible: ${producto.existencia}` : "Sin existencia"}
                </span>
                <span className="font-medium">{formatearMoneda(producto.precio)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Estados de la sección 8: buscando, error y vacío. */}
      {texto.trim() !== "" && !actualizada && filas.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Buscando…
        </p>
      )}
      {texto.trim() !== "" && error && (
        <p role="alert" className="absolute z-20 mt-1 w-full rounded-lg border border-red-200 bg-popover px-3 py-2 text-sm text-red-600 shadow-md">
          {error}
        </p>
      )}
      {texto.trim() !== "" && actualizada && !error && filas.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          No hay productos que coincidan.
        </p>
      )}
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent, type Ref } from "react";
import { DialogoCliente, type FilaCliente } from "@/components/clientes/dialogo-cliente";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusqueda } from "@/hooks/use-busqueda";
import { formatearMoneda } from "@/lib/formatos";
import { cn } from "@/lib/utils";

// Comprador de la venta (RF-V2). Por defecto es consumidor final y no pide datos; se puede
// buscar un cliente registrado por nombre o documento, o darlo de alta en el momento desde
// un modal. El modal no recarga la pantalla, así la venta en curso no se pierde.
export function SeleccionComprador({
  cliente,
  buscando,
  entrada,
  alCambiar,
  alBuscar,
}: {
  cliente: FilaCliente | null;
  buscando: boolean; // true = está eligiendo un cliente registrado
  entrada: Ref<HTMLInputElement>;
  alCambiar: (cliente: FilaCliente | null) => void;
  alBuscar: (buscando: boolean) => void;
}) {
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const [creando, setCreando] = useState(false);
  const { filas, actualizada } = useBusqueda<FilaCliente>("/api/clientes", texto);

  function elegir(elegido: FilaCliente) {
    alCambiar(elegido);
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
      evento.preventDefault();
      if (actualizada && filas[indice]) elegir(filas[indice]);
    } else if (evento.key === "Escape") {
      setTexto("");
    }
  }

  const esRegistrado = cliente !== null || buscando;

  return (
    <Pila className="gap-3">
      <Fila className="gap-1 rounded-lg bg-muted p-1">
        <Button
          type="button"
          size="sm"
          variant={esRegistrado ? "ghost" : "default"}
          className="flex-1"
          onClick={() => {
            alCambiar(null);
            alBuscar(false);
          }}
        >
          Consumidor final
        </Button>
        <Button
          type="button"
          size="sm"
          variant={esRegistrado ? "default" : "ghost"}
          className="flex-1"
          onClick={() => alBuscar(true)}
        >
          Cliente registrado
        </Button>
      </Fila>

      {cliente && (
        <Pila className="gap-2 rounded-lg border p-3">
          <Fila className="items-start justify-between">
            <Pila className="gap-0">
              <Texto className="font-medium">{cliente.nombre}</Texto>
              <Texto className="text-xs text-muted-foreground">
                {cliente.tipoDoc} {cliente.nroDoc}
              </Texto>
            </Pila>
            <Button type="button" variant="ghost" size="sm" onClick={() => alCambiar(null)}>
              <X /> Cambiar
            </Button>
          </Fila>
          <Fila className="justify-between">
            {cliente.cuentaCorriente ? (
              <Badge variant="outline">Cta. cte.</Badge>
            ) : (
              <Badge variant="secondary">Sin cuenta corriente</Badge>
            )}
            <Texto className="text-xs text-muted-foreground">
              Saldo{" "}
              <span className={cn("text-sm font-medium", cliente.saldo > 0 && "text-red-600")}>
                {formatearMoneda(cliente.saldo)}
              </span>
            </Texto>
          </Fila>
        </Pila>
      )}

      {!cliente && buscando && (
        <Pila className="gap-2">
          <div className="relative">
            <Input
              ref={entrada}
              value={texto}
              placeholder="Nombre o documento (F4)"
              aria-label="Buscar cliente"
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
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md"
              >
                {filas.map((fila, posicion) => (
                  <li
                    key={fila.id}
                    role="option"
                    aria-selected={posicion === indice}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      elegir(fila);
                    }}
                    className={cn(
                      "cursor-pointer rounded-md px-3 py-2 text-sm",
                      posicion === indice && "bg-muted",
                    )}
                  >
                    <span className="font-medium">{fila.nombre}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {fila.tipoDoc} {fila.nroDoc}
                      {fila.cuentaCorriente && " · Cta. cte."}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {texto.trim() !== "" && actualizada && filas.length === 0 && (
              <p className="absolute z-20 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                No hay clientes que coincidan.
              </p>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreando(true)}>
            Nuevo cliente
          </Button>
        </Pila>
      )}

      <DialogoCliente
        abierto={creando}
        alCambiar={setCreando}
        alCrear={(nuevo) => {
          alCambiar(nuevo);
          alBuscar(false);
        }}
      />
    </Pila>
  );
}

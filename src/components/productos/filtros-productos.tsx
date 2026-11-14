"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Categoria } from "./dialogo-producto";

const opcionesDeEstado = { true: "Activos", false: "Inactivos", todos: "Todos" };

// Los filtros viven en la URL (sección 10.6): buscar navega a /productos?q=...
// Solo el administrador puede ver los productos inactivos.
export function FiltrosProductos({
  q,
  categoriaId,
  activo,
  bajoMinimo,
  categorias,
  esAdmin,
}: {
  q: string;
  categoriaId: string;
  activo: string;
  bajoMinimo: boolean;
  categorias: Categoria[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [categoria, setCategoria] = useState(categoriaId || "todas");
  const [estado, setEstado] = useState(activo || "true");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(bajoMinimo);

  const opcionesDeCategoria = {
    todas: "Todas las categorías",
    ...Object.fromEntries(categorias.map((c) => [String(c.id), c.nombre])),
  };

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (texto.trim()) parametros.set("q", texto.trim());
    if (categoria !== "todas") parametros.set("categoriaId", categoria);
    if (estado !== "true") parametros.set("activo", estado);
    if (soloBajoMinimo) parametros.set("bajoMinimo", "true");
    router.push(`/productos?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
        <Input
          className="w-full sm:w-72"
          placeholder="Código o descripción"
          aria-label="Buscar productos"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Select items={opcionesDeCategoria} value={categoria} onValueChange={(valor) => setCategoria(valor ?? "todas")}>
          <SelectTrigger className="w-52" aria-label="Categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {esAdmin && (
          <Select items={opcionesDeEstado} value={estado} onValueChange={(valor) => setEstado(valor ?? "true")}>
            <SelectTrigger className="w-36" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          variant={soloBajoMinimo ? "default" : "outline"}
          aria-pressed={soloBajoMinimo}
          onClick={() => setSoloBajoMinimo(!soloBajoMinimo)}
        >
          Solo bajo mínimo
        </Button>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Fila>
    </form>
  );
}

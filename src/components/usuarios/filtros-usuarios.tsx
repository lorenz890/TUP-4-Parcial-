"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const opcionesDeEstado = { todos: "Todos", true: "Activos", false: "Inactivos" };

// Los filtros viven en la URL (sección 10.6): buscar navega a /usuarios?q=...&activo=...
export function FiltrosUsuarios({ q, activo }: { q: string; activo: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [estado, setEstado] = useState(activo || "todos");

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (texto.trim()) parametros.set("q", texto.trim());
    if (estado !== "todos") parametros.set("activo", estado);
    router.push(`/usuarios?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
        <Input
          className="w-full sm:w-72"
          placeholder="Buscar por nombre o email"
          aria-label="Buscar usuarios"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Select items={opcionesDeEstado} value={estado} onValueChange={(valor) => setEstado(valor ?? "todos")}>
          <SelectTrigger className="w-40" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Fila>
    </form>
  );
}

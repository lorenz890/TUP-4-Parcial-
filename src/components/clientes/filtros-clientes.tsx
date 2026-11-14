"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const opcionesDeEstado = { true: "Activos", false: "Inactivos", todos: "Todos" };

// Los filtros viven en la URL (sección 10.6): buscar navega a /clientes?q=...
export function FiltrosClientes({
  q,
  activo,
  conDeuda,
}: {
  q: string;
  activo: string;
  conDeuda: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [estado, setEstado] = useState(activo || "true");
  const [soloConDeuda, setSoloConDeuda] = useState(conDeuda);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (texto.trim()) parametros.set("q", texto.trim());
    if (estado !== "true") parametros.set("activo", estado);
    if (soloConDeuda) parametros.set("conDeuda", "true");
    router.push(`/clientes?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
        <Input
          className="w-full sm:w-72"
          placeholder="Nombre, DNI o CUIT"
          aria-label="Buscar clientes"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
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
        <Button
          type="button"
          variant={soloConDeuda ? "default" : "outline"}
          aria-pressed={soloConDeuda}
          onClick={() => setSoloConDeuda(!soloConDeuda)}
        >
          Solo con deuda
        </Button>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Fila>
    </form>
  );
}

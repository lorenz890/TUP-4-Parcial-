"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const opcionesDeTipo = {
  todos: "Todos los tipos",
  venta: "Venta",
  anulacion: "Anulación",
  ingreso: "Ingreso",
  egreso: "Egreso",
};

// Filtros de la pestaña "Existencias y movimientos", también en la URL.
export function FiltrosMovimientos({
  tipo,
  desde,
  hasta,
}: {
  tipo: string;
  desde: string;
  hasta: string;
}) {
  const router = useRouter();
  const [tipoElegido, setTipoElegido] = useState(tipo || "todos");
  const [diaDesde, setDiaDesde] = useState(desde);
  const [diaHasta, setDiaHasta] = useState(hasta);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (tipoElegido !== "todos") parametros.set("tipo", tipoElegido);
    if (diaDesde) parametros.set("desde", diaDesde);
    if (diaHasta) parametros.set("hasta", diaHasta);
    router.push(`/productos/existencias?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
        <Select items={opcionesDeTipo} value={tipoElegido} onValueChange={(valor) => setTipoElegido(valor ?? "todos")}>
          <SelectTrigger className="w-44" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(opcionesDeTipo).map(([valor, nombre]) => (
              <SelectItem key={valor} value={valor}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label htmlFor="desde">Desde</Label>
        <Input
          id="desde"
          type="date"
          className="w-40"
          value={diaDesde}
          onChange={(e) => setDiaDesde(e.target.value)}
        />
        <Label htmlFor="hasta">Hasta</Label>
        <Input
          id="hasta"
          type="date"
          className="w-40"
          value={diaHasta}
          onChange={(e) => setDiaHasta(e.target.value)}
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Fila>
    </form>
  );
}

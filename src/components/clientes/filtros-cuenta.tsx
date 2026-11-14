"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Rango de fechas de la cuenta corriente, también en la URL.
export function FiltrosCuenta({
  idCliente,
  desde,
  hasta,
}: {
  idCliente: number;
  desde: string;
  hasta: string;
}) {
  const router = useRouter();
  const [diaDesde, setDiaDesde] = useState(desde);
  const [diaHasta, setDiaHasta] = useState(hasta);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams({ vista: "cuenta" });
    if (diaDesde) parametros.set("desde", diaDesde);
    if (diaHasta) parametros.set("hasta", diaHasta);
    router.push(`/clientes/${idCliente}?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
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

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Fila } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMAS_DE_PAGO, NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";

const opcionesDeEstado = { todos: "Todos los estados", emitida: "Emitidas", anulada: "Anuladas" };

// Filtros del listado de facturas (RF-V8), en la URL: buscar navega a /ventas?q=...
// El administrador filtra por cualquier vendedor; el vendedor, solo por sí mismo.
export function FiltrosFacturas({
  q,
  desde,
  hasta,
  forma,
  clienteId,
  vendedorId,
  estado,
  clientes,
  vendedores,
}: {
  q: string;
  desde: string;
  hasta: string;
  forma: string;
  clienteId: string;
  vendedorId: string;
  estado: string;
  clientes: { id: number; nombre: string }[];
  vendedores: { id: number; nombre: string }[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [diaDesde, setDiaDesde] = useState(desde);
  const [diaHasta, setDiaHasta] = useState(hasta);
  const [formaElegida, setFormaElegida] = useState(forma || "todas");
  const [cliente, setCliente] = useState(clienteId || "todos");
  const [vendedor, setVendedor] = useState(vendedorId || "todos");
  const [estadoElegido, setEstadoElegido] = useState(estado || "todos");

  const opcionesDeForma = { todas: "Todas las formas de pago", ...NOMBRES_FORMA_DE_PAGO };
  const opcionesDeCliente = {
    todos: "Todos los clientes",
    ...Object.fromEntries(clientes.map((c) => [String(c.id), c.nombre])),
  };
  const opcionesDeVendedor = {
    todos: "Todos los vendedores",
    ...Object.fromEntries(vendedores.map((v) => [String(v.id), v.nombre])),
  };

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (texto.trim()) parametros.set("q", texto.trim());
    if (diaDesde) parametros.set("desde", diaDesde);
    if (diaHasta) parametros.set("hasta", diaHasta);
    if (formaElegida !== "todas") parametros.set("forma", formaElegida);
    if (cliente !== "todos") parametros.set("clienteId", cliente);
    if (vendedor !== "todos") parametros.set("vendedorId", vendedor);
    if (estadoElegido !== "todos") parametros.set("estado", estadoElegido);
    router.push(`/ventas?${parametros}`);
  }

  return (
    <form onSubmit={buscar}>
      <Fila>
        <Input
          className="w-full sm:w-64"
          placeholder="Número o cliente"
          aria-label="Buscar facturas"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Label htmlFor="desde">Desde</Label>
        <Input id="desde" type="date" className="w-40" value={diaDesde} onChange={(e) => setDiaDesde(e.target.value)} />
        <Label htmlFor="hasta">Hasta</Label>
        <Input id="hasta" type="date" className="w-40" value={diaHasta} onChange={(e) => setDiaHasta(e.target.value)} />

        <Select items={opcionesDeForma} value={formaElegida} onValueChange={(v) => setFormaElegida(v ?? "todas")}>
          <SelectTrigger className="w-52" aria-label="Forma de pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las formas de pago</SelectItem>
            {FORMAS_DE_PAGO.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {NOMBRES_FORMA_DE_PAGO[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={opcionesDeCliente} value={cliente} onValueChange={(v) => setCliente(v ?? "todos")}>
          <SelectTrigger className="w-52" aria-label="Cliente">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={opcionesDeVendedor} value={vendedor} onValueChange={(v) => setVendedor(v ?? "todos")}>
          <SelectTrigger className="w-52" aria-label="Vendedor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los vendedores</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={opcionesDeEstado} value={estadoElegido} onValueChange={(v) => setEstadoElegido(v ?? "todos")}>
          <SelectTrigger className="w-44" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="emitida">Emitidas</SelectItem>
            <SelectItem value="anulada">Anuladas</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Fila>
    </form>
  );
}

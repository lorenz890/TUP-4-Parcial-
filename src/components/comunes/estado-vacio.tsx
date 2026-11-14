import { Pila, Texto } from "@/components/maquetacion";

// Lo que se ve cuando un listado no tiene resultados.
export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <Pila className="items-center rounded-lg border border-dashed py-12">
      <Texto className="text-muted-foreground">{mensaje}</Texto>
    </Pila>
  );
}

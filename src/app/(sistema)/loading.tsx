import { Grilla, Pila } from "@/components/maquetacion";
import { Skeleton } from "@/components/ui/skeleton";

// Estado de carga por defecto de las pantallas del sistema (sección 8): esqueleto del tablero.
export default function CargandoInicio() {
  return (
    <Pila>
      <Skeleton className="h-9 w-56" />
      <Grilla className="sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((numero) => (
          <Skeleton key={numero} className="h-28" />
        ))}
      </Grilla>
      <Skeleton className="h-80 w-full" />
    </Pila>
  );
}

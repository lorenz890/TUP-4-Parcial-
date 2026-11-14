import { Pila } from "@/components/maquetacion";
import { Skeleton } from "@/components/ui/skeleton";

// Estado de carga de las pantallas de Ventas (sección 8).
export default function CargandoVentas() {
  return (
    <Pila>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-72 w-full" />
    </Pila>
  );
}

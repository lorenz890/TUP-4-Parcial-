import { Pila } from "@/components/maquetacion";
import { Skeleton } from "@/components/ui/skeleton";

// Estado de carga del listado (sección 8): esqueleto mientras llegan los datos.
export default function CargandoUsuarios() {
  return (
    <Pila>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </Pila>
  );
}

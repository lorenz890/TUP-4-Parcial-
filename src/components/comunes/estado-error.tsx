import { Pila, Texto, Titulo } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";

// Lo que se ve cuando una pantalla falla al cargar (sección 8: cada listado contempla
// error). Lo usa el error.tsx de cada módulo; solo cambia el nombre de lo que no cargó.
// El detalle técnico va al log del servidor: acá nunca se muestra.
export function EstadoError({ que, reintentar }: { que: string; reintentar: () => void }) {
  return (
    <Pila className="items-center py-16 text-center">
      <Titulo>Algo salió mal</Titulo>
      <Texto className="text-muted-foreground">No pudimos cargar {que}.</Texto>
      <Button onClick={reintentar}>Reintentar</Button>
    </Pila>
  );
}

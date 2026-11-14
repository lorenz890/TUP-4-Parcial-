import Link from "next/link";
import { Fila } from "@/components/maquetacion";
import { cn } from "@/lib/utils";

// Pestañas hechas con enlaces: cada una es una dirección propia (por ejemplo
// `?vista=cuenta`), así se puede recargar y compartir. La página indica cuál está activa.
export function Pestanas({
  pestanas,
}: {
  pestanas: { nombre: string; href: string; activa: boolean }[];
}) {
  return (
    <Fila className="gap-0 border-b">
      {pestanas.map(({ nombre, href, activa }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activa
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {nombre}
        </Link>
      ))}
    </Fila>
  );
}

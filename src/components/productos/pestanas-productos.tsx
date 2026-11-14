"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fila } from "@/components/maquetacion";
import { cn } from "@/lib/utils";

const pestanas = [
  { nombre: "Catálogo", ruta: "/productos" },
  { nombre: "Existencias y movimientos", ruta: "/productos/existencias" },
];

// Las dos pestañas de Productos: cada una es una pantalla propia, así cada una
// tiene su dirección y se puede recargar o compartir.
export function PestanasProductos() {
  const rutaActual = usePathname();

  return (
    <Fila className="gap-0 border-b">
      {pestanas.map(({ nombre, ruta }) => (
        <Link
          key={ruta}
          href={ruta}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            rutaActual === ruta
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

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Primitivas de maquetación (sección 10.6). Las páginas se arman con estas piezas
// y con los componentes de shadcn/ui, sin etiquetas HTML sueltas; todo el estilo
// se escribe con clases de Tailwind.

// Apila los hijos uno debajo del otro, con espacio entre ellos.
export function Pila({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

// Alinea los hijos en una fila; en pantallas chicas pasa a ocupar varias líneas.
export function Fila({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

export function Texto({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm", className)} {...props} />;
}

export function Titulo({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />;
}

// Reparte los hijos en columnas. Las columnas se indican con clases de Tailwind
// al usarla, por ejemplo <Grilla className="sm:grid-cols-4">.
export function Grilla({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-4", className)} {...props} />;
}

import Link from "next/link";
import { Fila, Texto } from "@/components/maquetacion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// El paginado vive en la URL (sección 10.6): cada botón es un enlace a la misma
// pantalla con otro `page`, conservando los demás filtros. Así se puede recargar
// y compartir.
export function Paginador({
  ruta,
  page,
  pageSize,
  total,
  filtros,
}: {
  ruta: string;
  page: number;
  pageSize: number;
  total: number;
  filtros: Record<string, string | undefined>;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  function enlace(pagina: number) {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) parametros.set(clave, valor);
    }
    parametros.set("page", String(pagina));
    return `${ruta}?${parametros}`;
  }

  return (
    <Fila className="justify-between">
      <Texto className="text-muted-foreground">
        {total} {total === 1 ? "resultado" : "resultados"} · Página {page} de {totalPaginas}
      </Texto>
      <Fila>
        {page > 1 ? (
          <Link href={enlace(page - 1)} className={buttonVariants({ variant: "outline" })}>
            Anterior
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}>
            Anterior
          </span>
        )}
        {page < totalPaginas ? (
          <Link href={enlace(page + 1)} className={buttonVariants({ variant: "outline" })}>
            Siguiente
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}>
            Siguiente
          </span>
        )}
      </Fila>
    </Fila>
  );
}

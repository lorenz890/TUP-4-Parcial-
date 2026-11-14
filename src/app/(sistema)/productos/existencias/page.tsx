import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Paginador } from "@/components/comunes/paginador";
import { Pila } from "@/components/maquetacion";
import { buttonVariants } from "@/components/ui/button";
import { FiltrosMovimientos } from "@/components/productos/filtros-movimientos";
import { PestanasProductos } from "@/components/productos/pestanas-productos";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { exigirUsuario } from "@/lib/sesion";
import { listarMovimientos } from "@/servicios/stock";

// RF-P6: movimientos de stock de todos los productos, del más nuevo al más viejo.
export default async function PaginaExistencias({ searchParams }: PageProps<"/productos/existencias">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;
  const movimientos = await listarMovimientos(usuario, parametros);

  const tipo = typeof parametros.tipo === "string" ? parametros.tipo : "";
  const desde = typeof parametros.desde === "string" ? parametros.desde : "";
  const hasta = typeof parametros.hasta === "string" ? parametros.hasta : "";

  return (
    <Pila>
      <EncabezadoPagina titulo="Productos" descripcion={`${movimientos.total} movimientos de stock`}>
        <Link href="/productos/categorias" className={buttonVariants({ variant: "outline" })}>
          Categorías
        </Link>
      </EncabezadoPagina>

      <PestanasProductos />
      <FiltrosMovimientos tipo={tipo} desde={desde} hasta={hasta} />
      <TablaMovimientos movimientos={movimientos.data} mostrarProducto />
      <Paginador
        ruta="/productos/existencias"
        page={movimientos.page}
        pageSize={movimientos.pageSize}
        total={movimientos.total}
        filtros={{ tipo, desde, hasta }}
      />
    </Pila>
  );
}

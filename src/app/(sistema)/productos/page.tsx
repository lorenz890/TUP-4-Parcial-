import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Paginador } from "@/components/comunes/paginador";
import { Pila } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BotonNuevoProducto } from "@/components/productos/boton-nuevo-producto";
import { FiltrosProductos } from "@/components/productos/filtros-productos";
import { PestanasProductos } from "@/components/productos/pestanas-productos";
import { formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";
import { listarProductos } from "@/servicios/productos";

// RF-P1: catálogo para cualquier usuario. La edición es solo del administrador.
export default async function PaginaProductos({ searchParams }: PageProps<"/productos">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;
  const esAdmin = usuario.rol === "admin";

  const [productos, categorias] = await Promise.all([
    listarProductos(usuario, parametros),
    listarCategorias(usuario, {}),
  ]);

  const q = typeof parametros.q === "string" ? parametros.q : "";
  const categoriaId = typeof parametros.categoriaId === "string" ? parametros.categoriaId : "";
  const activo = typeof parametros.activo === "string" ? parametros.activo : "";
  const bajoMinimo = parametros.bajoMinimo === "true";

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Productos"
        descripcion={`${productos.total} ${productos.total === 1 ? "producto" : "productos"} en el catálogo`}
      >
        <Link href="/productos/categorias" className={buttonVariants({ variant: "outline" })}>
          Categorías
        </Link>
        {esAdmin && <BotonNuevoProducto categorias={categorias} />}
      </EncabezadoPagina>

      <PestanasProductos />
      <FiltrosProductos
        q={q}
        categoriaId={categoriaId}
        activo={activo}
        bajoMinimo={bajoMinimo}
        categorias={categorias}
        esAdmin={esAdmin}
      />

      {productos.data.length === 0 ? (
        <EstadoVacio mensaje="No hay productos que coincidan con la búsqueda." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Existencia</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.data.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/productos/${producto.id}`} className="hover:underline">
                    {producto.codigo}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/productos/${producto.id}`} className="hover:underline">
                    {producto.descripcion}
                  </Link>
                  {!producto.activo && (
                    <Badge variant="secondary" className="ml-2">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{producto.categoria.nombre}</TableCell>
                <TableCell className="text-right">{formatearMoneda(producto.precio)}</TableCell>
                <TableCell className="text-right">
                  {/* Marca de los productos por debajo del mínimo (RF-P1). */}
                  {producto.bajoMinimo ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {producto.existencia} · bajo mínimo
                    </Badge>
                  ) : (
                    producto.existencia
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{producto.stockMinimo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        ruta="/productos"
        page={productos.page}
        pageSize={productos.pageSize}
        total={productos.total}
        filtros={{ q, categoriaId, activo, bajoMinimo: bajoMinimo ? "true" : "" }}
      />
    </Pila>
  );
}

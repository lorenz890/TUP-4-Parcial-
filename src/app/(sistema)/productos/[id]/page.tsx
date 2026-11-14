import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { InsigniaEstado } from "@/components/comunes/insignia-estado";
import { Paginador } from "@/components/comunes/paginador";
import { Grilla, Pila, Texto } from "@/components/maquetacion";
import { AccionesProducto } from "@/components/productos/acciones-producto";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api-error";
import { formatearMoneda } from "@/lib/formatos";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";
import { obtenerProducto } from "@/servicios/productos";
import { listarMovimientos } from "@/servicios/stock";

// RF-P1, RF-P6: ficha del producto con su historial de movimientos.
export default async function FichaProducto({ params, searchParams }: PageProps<"/productos/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const parametros = await searchParams;

  let producto;
  try {
    producto = await obtenerProducto(usuario, id);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "NO_ENCONTRADO" || error.code === "VALIDACION")) notFound();
    throw error;
  }

  const esAdmin = usuario.rol === "admin";
  const [movimientos, categorias] = await Promise.all([
    listarMovimientos(usuario, { page: parametros.page, productoId: id }),
    esAdmin ? listarCategorias(usuario, {}) : [],
  ]);

  const datos = [
    { nombre: "Existencia", valor: String(producto.existencia) },
    { nombre: "Stock mínimo", valor: String(producto.stockMinimo) },
    { nombre: "Precio de venta", valor: formatearMoneda(producto.precio) },
    { nombre: "Valor del stock", valor: formatearMoneda(producto.existencia * producto.precio) },
  ];

  return (
    <Pila>
      <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
        ← Productos
      </Link>

      <EncabezadoPagina
        titulo={producto.descripcion}
        descripcion={`${producto.codigo} · ${producto.categoria.nombre}${producto.bajoMinimo ? " · Bajo el stock mínimo" : ""}`}
      >
        {!producto.activo && <InsigniaEstado activo={false} />}
        {esAdmin && <AccionesProducto producto={producto} categorias={categorias} />}
      </EncabezadoPagina>

      <Grilla className="grid-cols-2 lg:grid-cols-4">
        {datos.map(({ nombre, valor }) => (
          <Card key={nombre}>
            <CardContent>
              <Texto className="text-muted-foreground">{nombre}</Texto>
              <Texto className="text-2xl font-semibold">{valor}</Texto>
            </CardContent>
          </Card>
        ))}
      </Grilla>

      <Texto className="font-medium">Movimientos de stock</Texto>
      <TablaMovimientos movimientos={movimientos.data} mostrarProducto={false} />
      <Paginador
        ruta={`/productos/${producto.id}`}
        page={movimientos.page}
        pageSize={movimientos.pageSize}
        total={movimientos.total}
        filtros={{}}
      />
    </Pila>
  );
}

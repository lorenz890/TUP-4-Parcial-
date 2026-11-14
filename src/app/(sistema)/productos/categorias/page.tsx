import Link from "next/link";
import { BotonNuevaCategoria } from "@/components/categorias/boton-nueva-categoria";
import { ListaCategorias } from "@/components/categorias/lista-categorias";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Pila } from "@/components/maquetacion";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";

// RF-P7: todos pueden ver las categorías; el alta, la edición y la baja son del administrador.
export default async function PaginaCategorias() {
  const usuario = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";

  // El administrador ve también las inactivas, para poder reactivarlas.
  const categorias = await listarCategorias(usuario, esAdmin ? { activa: "todas" } : {});

  return (
    <Pila>
      <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
        ← Productos
      </Link>
      <EncabezadoPagina titulo="Categorías" descripcion="Agrupan el catálogo para buscar y filtrar.">
        {esAdmin && <BotonNuevaCategoria />}
      </EncabezadoPagina>
      <ListaCategorias categorias={categorias} esAdmin={esAdmin} />
    </Pila>
  );
}

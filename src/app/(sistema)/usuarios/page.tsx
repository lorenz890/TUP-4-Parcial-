import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Paginador } from "@/components/comunes/paginador";
import { SinPermiso } from "@/components/comunes/sin-permiso";
import { Pila } from "@/components/maquetacion";
import { BotonNuevoUsuario } from "@/components/usuarios/boton-nuevo-usuario";
import { FiltrosUsuarios } from "@/components/usuarios/filtros-usuarios";
import { ListaUsuarios } from "@/components/usuarios/lista-usuarios";
import { ApiError } from "@/lib/api-error";
import { exigirUsuario } from "@/lib/sesion";
import { listarUsuarios } from "@/servicios/usuarios";

// RF-U4. Es un Server Component: llama directo al servicio, que verifica el rol.
export default async function PaginaUsuarios({ searchParams }: PageProps<"/usuarios">) {
  const usuario = await exigirUsuario();
  const parametros = await searchParams;

  let resultado;
  try {
    resultado = await listarUsuarios(usuario, parametros);
  } catch (error) {
    // Un vendedor que abre /usuarios a mano ve un mensaje claro en lugar de una pantalla rota.
    if (error instanceof ApiError && error.code === "SIN_PERMISO") return <SinPermiso />;
    throw error;
  }

  const q = typeof parametros.q === "string" ? parametros.q : "";
  const activo = typeof parametros.activo === "string" ? parametros.activo : "";

  return (
    <Pila>
      <EncabezadoPagina titulo="Usuarios" descripcion="Quién puede entrar al sistema y con qué rol.">
        <BotonNuevoUsuario />
      </EncabezadoPagina>
      <FiltrosUsuarios q={q} activo={activo} />
      <ListaUsuarios usuarios={resultado.data} usuarioActualId={usuario.id} />
      <Paginador
        ruta="/usuarios"
        page={resultado.page}
        pageSize={resultado.pageSize}
        total={resultado.total}
        filtros={{ q, activo }}
      />
    </Pila>
  );
}

import { NextResponse } from "next/server";
import { ApiError, aApiError } from "./api-error";
import type { UsuarioAutenticado } from "./permisos";
import { usuarioActual } from "./sesion";

type Contexto = {
  usuario: UsuarioAutenticado;
  params: Record<string, string>;
  consulta: URLSearchParams;
  // JSON sin validar: el servicio es quien lo valida con su esquema de zod.
  cuerpo: unknown;
};

type Opciones = {
  // Código HTTP de éxito: 201 en los POST que crean, 200 por defecto.
  estado?: number;
};

// Envoltorio común de los Route Handlers (sección 10.3): exige la sesión,
// resuelve los parámetros, lee el JSON y convierte cualquier error al formato
// de la 11.1. Así cada route.ts queda en pocas líneas: llamar al servicio y responder.
export function ruta(manejador: (contexto: Contexto) => Promise<unknown>, opciones: Opciones = {}) {
  return atender(true, manejador, opciones);
}

// Igual, pero sin exigir sesión ni entregar usuario. Solo para el login.
export function rutaPublica(
  manejador: (contexto: Omit<Contexto, "usuario">) => Promise<unknown>,
  opciones: Opciones = {},
) {
  return atender(false, manejador, opciones);
}

function atender(
  exigeSesion: boolean,
  manejador: (contexto: Contexto) => Promise<unknown>,
  opciones: Opciones,
) {
  return async (pedido: Request, { params }: { params: Promise<Record<string, string>> }) => {
    try {
      // Primero la sesión: un pedido sin sesión no llega ni a leer el cuerpo.
      const usuario = exigeSesion ? await exigirSesion() : undefined;

      const resultado = await manejador({
        // El "!" es seguro: solo es undefined en rutaPublica, cuyo manejador no pide usuario.
        usuario: usuario!,
        params: await params,
        consulta: new URL(pedido.url).searchParams,
        cuerpo: await leerCuerpo(pedido),
      });

      // Un resultado vacío es un 204 (por ejemplo, logout).
      if (resultado === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(resultado, { status: opciones.estado ?? 200 });
    } catch (error) {
      const apiError = aApiError(error);
      return NextResponse.json(
        {
          error: {
            code: apiError.code,
            message: apiError.message,
            details: apiError.details,
          },
        },
        { status: apiError.status },
      );
    }
  };
}

async function exigirSesion(): Promise<UsuarioAutenticado> {
  const usuario = await usuarioActual();
  if (!usuario) {
    throw new ApiError(401, "NO_AUTENTICADO", "Tenés que iniciar sesión.");
  }
  return usuario;
}

// Los GET y DELETE no traen cuerpo; en los demás, un JSON roto es un error 400.
async function leerCuerpo(pedido: Request): Promise<unknown> {
  if (pedido.method === "GET" || pedido.method === "DELETE") return undefined;

  const texto = await pedido.text();
  if (texto === "") return undefined;

  try {
    return JSON.parse(texto);
  } catch {
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo no es un JSON válido.");
  }
}

import { aApiError, type CodigoError } from "./api-error";
import type { UsuarioAutenticado } from "./permisos";
import { usuarioActual } from "./sesion";

// Lo que reciben los formularios: nunca se lanza, así el formulario puede mostrar
// el error junto al campo (sección 10.3).
export type Resultado<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: CodigoError; message: string; details?: unknown } };

// Envoltorio de las Server Actions. Es el equivalente de ruta() para los
// formularios: ambos llaman a los mismos servicios.
export function accion<Entrada, Salida>(
  manejador: (usuario: UsuarioAutenticado, entrada: Entrada) => Promise<Salida>,
) {
  return async (entrada: Entrada): Promise<Resultado<Salida>> => {
    try {
      const usuario = await usuarioActual();
      if (!usuario) {
        return {
          ok: false,
          error: { code: "NO_AUTENTICADO", message: "Tenés que iniciar sesión." },
        };
      }
      return { ok: true, data: await manejador(usuario, entrada) };
    } catch (error) {
      return errorDeAccion(error);
    }
  };
}

// Igual, pero sin exigir sesión. Solo para el login.
export function accionPublica<Entrada, Salida>(manejador: (entrada: Entrada) => Promise<Salida>) {
  return async (entrada: Entrada): Promise<Resultado<Salida>> => {
    try {
      return { ok: true, data: await manejador(entrada) };
    } catch (error) {
      return errorDeAccion(error);
    }
  };
}

function errorDeAccion(error: unknown): Resultado<never> {
  const { code, message, details } = aApiError(error);
  return { ok: false, error: { code, message, details } };
}

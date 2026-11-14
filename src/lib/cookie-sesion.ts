import { createHmac, timingSafeEqual } from "node:crypto";

// Cookie de sesión propia y firmada (sin Auth.js). Vale "idUsuario.vencimiento.firma".
// La firma (HMAC con SESSION_SECRET) impide que alguien arme una cookie a mano
// o cambie el id. Este módulo no toca la base ni next/headers para que también
// lo pueda usar el proxy.
export const NOMBRE_COOKIE = "sesion";
export const DURACION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

function firmar(texto: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("Falta SESSION_SECRET en el entorno (mínimo 32 caracteres).");
  }
  return createHmac("sha256", secreto).update(texto).digest("base64url");
}

export function crearValorCookie(usuarioId: number): string {
  const vence = Math.floor(Date.now() / 1000) + DURACION_SEGUNDOS;
  const datos = `${usuarioId}.${vence}`;
  return `${datos}.${firmar(datos)}`;
}

// Devuelve el id del usuario si la cookie es auténtica y no venció; si no, null.
export function leerValorCookie(valor: string | undefined): number | null {
  if (!valor) return null;

  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, vence, firma] = partes;

  // timingSafeEqual compara en tiempo constante (evita adivinar la firma por el tiempo)
  // y exige buffers del mismo largo, por eso se chequea antes.
  const esperada = Buffer.from(firmar(`${id}.${vence}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return null;
  }

  if (Number(vence) < Math.floor(Date.now() / 1000)) return null;
  return Number(id);
}

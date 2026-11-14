import { NextRequest, NextResponse } from "next/server";
import { leerValorCookie, NOMBRE_COOKIE } from "@/lib/cookie-sesion";

// Barrera 1 (sección 10.5): sin cookie firmada y vigente no se pasa de acá.
// Solo mira la cookie; que el usuario exista y siga activo lo comprueban las
// barreras 2 (páginas) y 3 (servicios), que sí consultan la base.
export function proxy(pedido: NextRequest) {
  const { pathname } = pedido.nextUrl;

  // Las únicas rutas públicas: la pantalla de login y el endpoint de login.
  if (pathname === "/login" || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  if (leerValorCookie(pedido.cookies.get(NOMBRE_COOKIE)?.value) !== null) {
    return NextResponse.next();
  }

  // La API responde 401 con el formato estándar; las pantallas redirigen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "NO_AUTENTICADO", message: "Tenés que iniciar sesión." } },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", pedido.url));
}

// Todo menos los archivos internos de Next, que no pasan por la barrera.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

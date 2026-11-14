"use server";

import { redirect } from "next/navigation";
import { accion, accionPublica } from "@/lib/accion";
import { abrirSesion, cerrarSesion } from "@/lib/sesion";
import { cambiarContrasena, iniciarSesion } from "@/servicios/auth";

// RF-U1. Igual que la ruta de login: el servicio valida y la acción abre la cookie.
export const iniciarSesionAccion = accionPublica(async (entrada: unknown) => {
  const usuario = await iniciarSesion(entrada);
  await abrirSesion(usuario.id);
  return usuario;
});

// RF-U5
export const cambiarContrasenaAccion = accion(cambiarContrasena);

// RF-U1. Es un <form action>: funciona aunque el navegador no cargue JavaScript.
export async function salirAccion() {
  await cerrarSesion();
  redirect("/login");
}

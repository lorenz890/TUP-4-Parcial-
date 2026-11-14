import { crearUsuario, listarUsuarios } from "@/servicios/usuarios";
import { ruta } from "@/lib/ruta";

// RF-U4
export const GET = ruta(({ usuario, consulta }) =>
  listarUsuarios(usuario, Object.fromEntries(consulta)),
);

export const POST = ruta(({ usuario, cuerpo }) => crearUsuario(usuario, cuerpo), { estado: 201 });

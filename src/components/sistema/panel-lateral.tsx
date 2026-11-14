"use client";

import { LayoutDashboard, Package, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pila, Texto } from "@/components/maquetacion";
import { cn } from "@/lib/utils";
import type { UsuarioAutenticado } from "@/lib/permisos";

// Por ahora solo los módulos que existen; se suman uno por etapa.
const modulos = [
  { nombre: "Inicio", ruta: "/", icono: LayoutDashboard, soloAdmin: false },
  { nombre: "Productos", ruta: "/productos", icono: Package, soloAdmin: false },
  { nombre: "Usuarios", ruta: "/usuarios", icono: Users, soloAdmin: true },
];

// Panel lateral con el módulo activo resaltado. Ocultar "Usuarios" al vendedor es
// solo una ayuda visual: el permiso real lo verifica el servicio.
export function PanelLateral({
  rol,
  alNavegar,
}: {
  rol: UsuarioAutenticado["rol"];
  alNavegar?: () => void; // el menú del celular se cierra al elegir un módulo
}) {
  const rutaActual = usePathname();

  return (
    <Pila className="gap-1 p-3">
      <Texto className="px-3 pb-3 text-lg font-semibold">Gestión comercial</Texto>
      {modulos
        .filter((modulo) => !modulo.soloAdmin || rol === "admin")
        .map(({ nombre, ruta, icono: Icono }) => {
          const activo = ruta === "/" ? rutaActual === "/" : rutaActual.startsWith(ruta);
          return (
            <Link
              key={ruta}
              href={ruta}
              onClick={alNavegar}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activo ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <Icono className="size-4" />
              {nombre}
            </Link>
          );
        })}
    </Pila>
  );
}

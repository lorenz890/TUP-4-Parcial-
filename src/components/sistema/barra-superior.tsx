"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { salirAccion } from "@/acciones/auth";
import { Fila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { PanelLateral } from "./panel-lateral";

// Barra de arriba: usuario conectado y botón de salir. En pantallas chicas
// (menos de 768 px) el panel lateral desaparece y se abre desde el botón del menú.
export function BarraSuperior({ usuario }: { usuario: UsuarioAutenticado }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <Fila className="justify-between border-b px-4 py-2">
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        aria-label="Abrir el menú"
        onClick={() => setMenuAbierto(true)}
      >
        <Menu />
      </Button>

      <Fila className="ml-auto">
        <Link href="/perfil" className="text-right hover:underline">
          <Texto className="font-medium leading-tight">{usuario.nombre}</Texto>
          <Texto className="text-xs capitalize leading-tight text-muted-foreground">
            {usuario.rol}
          </Texto>
        </Link>
        <form action={salirAccion}>
          <Button type="submit" variant="outline">
            Salir
          </Button>
        </form>
      </Fila>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <PanelLateral rol={usuario.rol} alNavegar={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>
    </Fila>
  );
}

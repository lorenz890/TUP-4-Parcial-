import { redirect } from "next/navigation";
import { Package, Receipt, ShieldCheck, Store, Users } from "lucide-react";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { Fila, Grilla, Pila, Texto, Titulo } from "@/components/maquetacion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usuarioActual } from "@/lib/sesion";

// Única página pública (RF-U2). Si ya hay sesión, no tiene sentido mostrarla.
export default async function PaginaLogin() {
  if (await usuarioActual()) redirect("/");

  return (
    <Grilla className="min-h-screen gap-0 lg:grid-cols-2">
      {/* Panel de presentación: en celular se oculta para que el formulario quede a la vista sin deslizar. */}
      <Pila className="hidden justify-center gap-12 bg-zinc-900 p-10 text-zinc-100 lg:flex">
        <Fila className="gap-3">
          <Store className="size-8 text-blue-400" />
          <Texto className="text-xl font-semibold">Gestión comercial</Texto>
        </Fila>

        <Pila className="gap-6">
          <Titulo className="text-3xl">Todo tu negocio en un solo lugar.</Titulo>
          <Pila className="gap-3 text-zinc-300">
            <Fila className="gap-3">
              <Receipt className="size-5 text-blue-400" />
              <Texto>Ventas y facturación</Texto>
            </Fila>
            <Fila className="gap-3">
              <Package className="size-5 text-blue-400" />
              <Texto>Control de stock</Texto>
            </Fila>
            <Fila className="gap-3">
              <Users className="size-5 text-blue-400" />
              <Texto>Clientes y cuentas corrientes</Texto>
            </Fila>
            <Fila className="gap-3">
              <ShieldCheck className="size-5 text-blue-400" />
              <Texto>Usuarios y permisos</Texto>
            </Fila>
          </Pila>
        </Pila>
      </Pila>

      {/* Columna del formulario: es la misma tarjeta de antes, centrada. */}
      <Pila className="items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Gestión comercial</CardTitle>
            <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormularioLogin />
          </CardContent>
        </Card>
      </Pila>
    </Grilla>
  );
}

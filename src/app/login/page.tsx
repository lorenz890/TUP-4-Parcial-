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
      <Pila className="hidden justify-between bg-zinc-900 p-10 text-zinc-100 lg:flex">
        <Fila className="gap-3">
          <Store className="size-8 text-blue-400" />
          <Texto className="text-xl font-semibold">Gestión comercial</Texto>
        </Fila>

        <Pila className="gap-6">
          <Titulo className="text-3xl">Vendé, cobrá y controlá tu stock sin vueltas</Titulo>
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

        <Texto className="text-zinc-500">2º Parcial · Programación IV</Texto>
      </Pila>

      {/* Columna del formulario, centrada. El pb-40 reserva lugar para que los datos del grupo no la tapen. */}
      <Pila className="relative items-center justify-center bg-muted/40 p-4 pb-40">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Ingresá a tu cuenta</CardTitle>
            <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* La variable se lee en el servidor; si no está, los botones demo ni se dibujan. */}
            <FormularioLogin mostrarDemo={process.env.DEMO_LOGIN === "true"} />
          </CardContent>
        </Card>
        <Texto className="text-muted-foreground">¿No tenés usuario? Pedíselo al administrador</Texto>

        <Pila className="absolute right-4 bottom-4 gap-1 rounded-xl bg-blue-600 px-4 py-3 text-right text-white shadow-lg">
          <Texto className="border-b border-white/30 pb-1 font-semibold">Grupo 6</Texto>
          <Texto>Lorenzo Gaiser 61851</Texto>
          <Texto>Ulices Acosta 63409</Texto>
          <Texto>Tomás Gómez Asat 61343</Texto>
        </Pila>
      </Pila>
    </Grilla>
  );
}

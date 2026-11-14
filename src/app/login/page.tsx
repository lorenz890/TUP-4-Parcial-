import { redirect } from "next/navigation";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { Pila } from "@/components/maquetacion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usuarioActual } from "@/lib/sesion";

// Única página pública (RF-U2). Si ya hay sesión, no tiene sentido mostrarla.
export default async function PaginaLogin() {
  if (await usuarioActual()) redirect("/");

  return (
    <Pila className="min-h-screen items-center justify-center bg-muted/40 p-4">
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
  );
}

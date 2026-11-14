import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Pila, Texto } from "@/components/maquetacion";
import { FormularioContrasena } from "@/components/perfil/formulario-contrasena";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirUsuario } from "@/lib/sesion";

// RF-U5: cada usuario cambia su contraseña.
export default async function PaginaPerfil() {
  const usuario = await exigirUsuario();

  return (
    <Pila>
      <EncabezadoPagina titulo="Mi perfil" descripcion={`${usuario.nombre} · ${usuario.email}`} />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Usá al menos 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioContrasena />
        </CardContent>
      </Card>
      <Texto className="text-muted-foreground">Rol: {usuario.rol}</Texto>
    </Pila>
  );
}

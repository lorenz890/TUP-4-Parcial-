"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearUsuarioAccion, editarUsuarioAccion } from "@/acciones/usuarios";
import { Campo } from "@/components/comunes/campo";
import { Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { esquemaCrearUsuario, esquemaEditarUsuario } from "@/esquemas/usuarios";
import type { ROLES } from "@/esquemas/valores";
import { useFormulario } from "@/hooks/use-formulario";

export type FilaUsuario = {
  id: number;
  nombre: string;
  email: string;
  rol: (typeof ROLES)[number];
  activo: boolean;
};

const nombresDeRol = { admin: "Administrador", vendedor: "Vendedor" };

// Alta (sin `usuario`) y edición (con `usuario`) en el mismo diálogo.
export function DialogoUsuario({
  abierto,
  alCambiar,
  usuario,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  usuario?: FilaUsuario;
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {usuario
              ? "Cambiá los datos o el rol."
              : "La contraseña es temporal: el usuario puede cambiarla desde su perfil."}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario vive adentro para que su estado empiece de cero cada vez que se abre. */}
        <FormularioUsuario usuario={usuario} alTerminar={() => alCambiar(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioUsuario({
  usuario,
  alTerminar,
}: {
  usuario?: FilaUsuario;
  alTerminar: () => void;
}) {
  const router = useRouter();
  const esEdicion = usuario !== undefined;

  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    // En la edición no se pide contraseña: para eso está "Restablecer contraseña".
    esquema: esEdicion ? esquemaEditarUsuario : esquemaCrearUsuario,
    valoresIniciales: {
      nombre: usuario?.nombre ?? "",
      email: usuario?.email ?? "",
      rol: usuario?.rol ?? ("vendedor" as FilaUsuario["rol"]),
      password: esEdicion ? undefined : "",
    },
    enviar: (datos) =>
      esEdicion ? editarUsuarioAccion({ id: usuario.id, datos }) : crearUsuarioAccion(datos),
    alExito: () => {
      toast.success(esEdicion ? "Usuario actualizado." : "Usuario creado.");
      alTerminar();
      router.refresh(); // vuelve a pedir el listado
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <Input
            id="nombre"
            value={valores.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
          />
        </Campo>
        <Campo id="email" etiqueta="Email" error={errores.email}>
          <Input
            id="email"
            type="email"
            value={valores.email}
            onChange={(e) => cambiar("email", e.target.value)}
            aria-invalid={Boolean(errores.email)}
          />
        </Campo>
        <Campo id="rol" etiqueta="Rol" error={errores.rol}>
          <Select
            items={nombresDeRol}
            value={valores.rol}
            onValueChange={(rol) => cambiar("rol", rol as FilaUsuario["rol"])}
          >
            <SelectTrigger id="rol" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        {!esEdicion && (
          <Campo id="password" etiqueta="Contraseña temporal" error={errores.password}>
            <Input
              id="password"
              type="text"
              autoComplete="off"
              value={valores.password ?? ""}
              onChange={(e) => cambiar("password", e.target.value)}
              aria-invalid={Boolean(errores.password)}
            />
          </Campo>
        )}
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
      </Pila>
    </form>
  );
}

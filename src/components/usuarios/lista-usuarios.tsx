"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { editarUsuarioAccion, restablecerContrasenaAccion } from "@/acciones/usuarios";
import { ConfirmarAccion } from "@/components/comunes/confirmar-accion";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { InsigniaEstado } from "@/components/comunes/insignia-estado";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogoUsuario, type FilaUsuario } from "./dialogo-usuario";

export function ListaUsuarios({
  usuarios,
  usuarioActualId,
}: {
  usuarios: FilaUsuario[];
  usuarioActualId: number;
}) {
  const router = useRouter();
  const [aEditar, setAEditar] = useState<FilaUsuario | null>(null);
  const [aDesactivar, setADesactivar] = useState<FilaUsuario | null>(null);
  const [aRestablecer, setARestablecer] = useState<FilaUsuario | null>(null);
  // La contraseña temporal se muestra una sola vez: se guarda solo en este estado.
  const [claveTemporal, setClaveTemporal] = useState<string | null>(null);

  async function cambiarActivo(usuario: FilaUsuario) {
    const resultado = await editarUsuarioAccion({
      id: usuario.id,
      datos: { activo: !usuario.activo },
    });
    if (!resultado.ok) return toast.error(resultado.error.message);

    toast.success(usuario.activo ? "Usuario desactivado." : "Usuario activado.");
    router.refresh();
  }

  async function restablecer(usuario: FilaUsuario) {
    const resultado = await restablecerContrasenaAccion(usuario.id);
    if (!resultado.ok) return toast.error(resultado.error.message);

    setClaveTemporal(resultado.data.passwordTemporal);
  }

  if (usuarios.length === 0) {
    return <EstadoVacio mensaje="No hay usuarios que coincidan con la búsqueda." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="font-medium">{usuario.nombre}</TableCell>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {usuario.rol}
                </Badge>
              </TableCell>
              <TableCell>
                <InsigniaEstado activo={usuario.activo} />
              </TableCell>
              <TableCell>
                <Fila className="justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAEditar(usuario)}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setARestablecer(usuario)}>
                    Restablecer contraseña
                  </Button>
                  {/* Un admin no puede desactivarse a sí mismo (el servicio también lo rechaza). */}
                  {usuario.id !== usuarioActualId &&
                    (usuario.activo ? (
                      <Button variant="destructive" size="sm" onClick={() => setADesactivar(usuario)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => cambiarActivo(usuario)}>
                        Activar
                      </Button>
                    ))}
                </Fila>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* `key` fuerza un formulario nuevo para cada usuario que se edita. */}
      <DialogoUsuario
        key={aEditar?.id}
        abierto={aEditar !== null}
        alCambiar={(abierto) => !abierto && setAEditar(null)}
        usuario={aEditar ?? undefined}
      />

      <ConfirmarAccion
        abierto={aDesactivar !== null}
        alCambiar={(abierto) => !abierto && setADesactivar(null)}
        titulo="¿Desactivar usuario?"
        descripcion={`${aDesactivar?.nombre ?? ""} no va a poder ingresar al sistema. Sus datos se conservan y se puede volver a activar.`}
        textoConfirmar="Desactivar"
        alConfirmar={() => aDesactivar && cambiarActivo(aDesactivar)}
      />

      <ConfirmarAccion
        abierto={aRestablecer !== null}
        alCambiar={(abierto) => !abierto && setARestablecer(null)}
        titulo="¿Restablecer la contraseña?"
        descripcion={`Se genera una contraseña temporal para ${aRestablecer?.nombre ?? ""} y la anterior deja de servir.`}
        textoConfirmar="Restablecer"
        alConfirmar={() => aRestablecer && restablecer(aRestablecer)}
      />

      <Dialog open={claveTemporal !== null} onOpenChange={(abierto) => !abierto && setClaveTemporal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Copiala ahora y pasásela al usuario: no se vuelve a mostrar.
            </DialogDescription>
          </DialogHeader>
          <Pila>
            <Fila className="justify-between rounded-lg border bg-muted px-3 py-2">
              <Texto className="font-mono text-base">{claveTemporal}</Texto>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copiar contraseña"
                onClick={() => {
                  navigator.clipboard.writeText(claveTemporal ?? "");
                  toast.success("Copiada.");
                }}
              >
                <Copy />
              </Button>
            </Fila>
            <Button onClick={() => setClaveTemporal(null)}>Listo</Button>
          </Pila>
        </DialogContent>
      </Dialog>
    </>
  );
}

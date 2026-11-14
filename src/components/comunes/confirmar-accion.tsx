"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Confirmación de acciones irreversibles o delicadas: desactivar, dar de baja,
// anular (sección 8). Se muestra mientras `abierto` sea true.
export function ConfirmarAccion({
  abierto,
  alCambiar,
  titulo,
  descripcion,
  textoConfirmar,
  alConfirmar,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
  alConfirmar: () => void;
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={alCambiar}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              alCambiar(false);
              alConfirmar();
            }}
          >
            {textoConfirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

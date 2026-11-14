"use client";

import { toast } from "sonner";
import { cambiarContrasenaAccion } from "@/acciones/auth";
import { Campo } from "@/components/comunes/campo";
import { Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esquemaCambioContrasena } from "@/esquemas/auth";
import { useFormulario } from "@/hooks/use-formulario";

export function FormularioContrasena() {
  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esquemaCambioContrasena,
    valoresIniciales: { actual: "", nueva: "" },
    enviar: cambiarContrasenaAccion,
    alExito: () => {
      toast.success("Contraseña actualizada.");
      cambiar("actual", "");
      cambiar("nueva", "");
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="actual" etiqueta="Contraseña actual" error={errores.actual}>
          <Input
            id="actual"
            type="password"
            autoComplete="current-password"
            value={valores.actual}
            onChange={(e) => cambiar("actual", e.target.value)}
            aria-invalid={Boolean(errores.actual)}
          />
        </Campo>
        <Campo id="nueva" etiqueta="Contraseña nueva" error={errores.nueva}>
          <Input
            id="nueva"
            type="password"
            autoComplete="new-password"
            value={valores.nueva}
            onChange={(e) => cambiar("nueva", e.target.value)}
            aria-invalid={Boolean(errores.nueva)}
          />
        </Campo>
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando} className="self-start">
          {enviando ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </Pila>
    </form>
  );
}

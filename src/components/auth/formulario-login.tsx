"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { iniciarSesionAccion } from "@/acciones/auth";
import { Campo } from "@/components/comunes/campo";
import { Fila, Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esquemaLogin } from "@/esquemas/auth";
import { useFormulario } from "@/hooks/use-formulario";

export function FormularioLogin() {
  const router = useRouter();
  // Solo cambia cómo se ve el campo; el valor que se envía es el mismo.
  const [verPassword, setVerPassword] = useState(false);
  const { valores, errores, enviando, cambiar, alEnviar } = useFormulario({
    esquema: esquemaLogin,
    valoresIniciales: { email: "", password: "" },
    enviar: iniciarSesionAccion,
    alExito: () => {
      router.push("/");
      router.refresh(); // vuelve a pedir el layout, ahora con el usuario conectado
    },
  });

  return (
    <form onSubmit={alEnviar} noValidate>
      <Pila>
        <Campo id="email" etiqueta="Email" error={errores.email}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            value={valores.email}
            onChange={(e) => cambiar("email", e.target.value)}
            aria-invalid={Boolean(errores.email)}
          />
        </Campo>
        <Campo id="password" etiqueta="Contraseña" error={errores.password}>
          <Fila className="relative flex-nowrap">
            <Input
              id="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              value={valores.password}
              onChange={(e) => cambiar("password", e.target.value)}
              aria-invalid={Boolean(errores.password)}
              className="pr-9"
            />
            {/* type="button" para que el ojito no envíe el formulario. */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-0.5"
              onClick={() => setVerPassword(!verPassword)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verPassword ? <EyeOff /> : <Eye />}
            </Button>
          </Fila>
        </Campo>
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando} className="bg-blue-600 text-white hover:bg-blue-700">
          {enviando ? "Ingresando..." : "Ingresar"}
        </Button>
      </Pila>
    </form>
  );
}

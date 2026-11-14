"use client";

import { useRouter } from "next/navigation";
import { iniciarSesionAccion } from "@/acciones/auth";
import { Campo } from "@/components/comunes/campo";
import { Pila, Texto } from "@/components/maquetacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esquemaLogin } from "@/esquemas/auth";
import { useFormulario } from "@/hooks/use-formulario";

export function FormularioLogin() {
  const router = useRouter();
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={valores.password}
            onChange={(e) => cambiar("password", e.target.value)}
            aria-invalid={Boolean(errores.password)}
          />
        </Campo>
        {errores.general && <Texto className="text-destructive">{errores.general}</Texto>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </Button>
      </Pila>
    </form>
  );
}

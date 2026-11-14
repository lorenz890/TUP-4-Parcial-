"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import type { Resultado } from "@/lib/accion";

type Errores = Record<string, string>;

// Resuelve todos los formularios igual (sección 10.6): valida con el MISMO
// esquema de zod que usa el servidor, muestra los errores junto a cada campo
// (primero los de zod, después los del servidor), maneja el estado de envío y,
// si el servidor rechaza algo que no es de un campo puntual, lo deja en errores.general.
export function useFormulario<Valores extends Record<string, unknown>, Salida>({
  esquema,
  valoresIniciales,
  enviar,
  alExito,
}: {
  esquema: z.ZodType;
  valoresIniciales: Valores;
  // `unknown` porque los servicios reciben datos sin validar y vuelven a validar ellos.
  enviar: (datos: unknown) => Promise<Resultado<Salida>>;
  alExito: (resultado: Salida) => void;
}) {
  const [valores, setValores] = useState(valoresIniciales);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  function cambiar<Campo extends keyof Valores>(campo: Campo, valor: Valores[Campo]) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo as string]: "", general: "" }));
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();

    const revision = esquema.safeParse(valores);
    if (!revision.success) {
      const deZod: Errores = {};
      for (const problema of revision.error.issues) {
        deZod[String(problema.path[0] ?? "general")] ??= problema.message;
      }
      setErrores(deZod);
      return;
    }

    setEnviando(true);
    const resultado = await enviar(revision.data);
    setEnviando(false);

    if (resultado.ok) {
      setErrores({});
      alExito(resultado.data);
      return;
    }

    const deServidor: Errores = {};
    const detalles = resultado.error.details;
    if (Array.isArray(detalles)) {
      for (const detalle of detalles) {
        deServidor[detalle.campo || "general"] ??= detalle.mensaje;
      }
    }
    // Sin detalle por campo (credenciales, email repetido...): va como error general.
    if (Object.keys(deServidor).length === 0) deServidor.general = resultado.error.message;
    setErrores(deServidor);
  }

  return { valores, errores, enviando, cambiar, alEnviar };
}

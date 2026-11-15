"use client";

import { useEffect, useState } from "react";

// Búsqueda en vivo contra la API REST mientras se escribe (sección 10.6). Espera un
// instante a que la persona termine de teclear y cancela el pedido anterior si todavía
// no volvió. `actualizada` dice si los resultados son los del texto actual: mientras
// llega la respuesta nueva se siguen viendo los anteriores, pero no se pueden elegir.
// `error` trae el mensaje si la búsqueda falló (sección 8: el listado muestra su error).
export function useBusqueda<T>(ruta: string, texto: string) {
  const busqueda = texto.trim();
  const [respuesta, setRespuesta] = useState<{ busqueda: string; filas: T[]; error: string | null }>({
    busqueda: "",
    filas: [],
    error: null,
  });

  useEffect(() => {
    if (busqueda === "") return;

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const separador = ruta.includes("?") ? "&" : "?";
        const url = `${ruta}${separador}q=${encodeURIComponent(busqueda)}&pageSize=8`;
        const llegada = await fetch(url, { signal: controlador.signal });
        const cuerpo = await llegada.json();
        if (!llegada.ok) {
          // La API responde siempre { error: { message } } (sección 11.1); por ejemplo, sesión vencida.
          setRespuesta({ busqueda, filas: [], error: cuerpo.error?.message ?? "No se pudo buscar." });
          return;
        }
        setRespuesta({ busqueda, filas: cuerpo.data, error: null });
      } catch {
        // Si se canceló porque se siguió escribiendo, no es un error: viene otra búsqueda.
        if (controlador.signal.aborted) return;
        setRespuesta({ busqueda, filas: [], error: "No se pudo buscar. Revisá la conexión." });
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [ruta, busqueda]);

  const actualizada = busqueda === respuesta.busqueda;
  return {
    filas: busqueda === "" ? [] : respuesta.filas,
    actualizada,
    error: actualizada ? respuesta.error : null,
  };
}

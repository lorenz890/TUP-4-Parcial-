"use client";

import { useEffect, useState } from "react";

// Búsqueda en vivo contra la API REST mientras se escribe (sección 10.6). Espera un
// instante a que la persona termine de teclear y cancela el pedido anterior si todavía
// no volvió. `actualizada` dice si los resultados son los del texto actual: mientras
// llega la respuesta nueva se siguen viendo los anteriores, pero no se pueden elegir.
export function useBusqueda<T>(ruta: string, texto: string) {
  const busqueda = texto.trim();
  const [respuesta, setRespuesta] = useState<{ busqueda: string; filas: T[] }>({
    busqueda: "",
    filas: [],
  });

  useEffect(() => {
    if (busqueda === "") return;

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const separador = ruta.includes("?") ? "&" : "?";
        const url = `${ruta}${separador}q=${encodeURIComponent(busqueda)}&pageSize=8`;
        const llegada = await fetch(url, { signal: controlador.signal });
        if (!llegada.ok) return;
        const cuerpo = await llegada.json();
        setRespuesta({ busqueda, filas: cuerpo.data });
      } catch {
        // Búsqueda cancelada (se siguió escribiendo) o sin conexión: se ignora.
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [ruta, busqueda]);

  return {
    filas: busqueda === "" ? [] : respuesta.filas,
    actualizada: busqueda === respuesta.busqueda,
  };
}

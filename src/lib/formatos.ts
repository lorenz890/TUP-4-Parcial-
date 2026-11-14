// Único módulo de formatos (sección 10.6): los componentes y los servicios no
// formatean por su cuenta. Los importes entran siempre en centavos enteros.

const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

const formatoNumero = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // Sin esto, es-AR no agrupa los números de 4 cifras ("1234,50").
  useGrouping: "always",
});

// 1234550 → "$ 12.345,50"
export function formatearMoneda(centavos: number): string {
  return `$ ${formatoNumero.format(centavos / 100)}`;
}

function partesDeFecha(fechaIso: string, opciones: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_ARGENTINA,
    ...opciones,
  }).format(new Date(fechaIso));
}

// Las fechas llegan en ISO 8601 UTC y se muestran en hora de Argentina.
// "2026-10-29T18:24:00Z" → "29/10/2026"
export function formatearFecha(fechaIso: string): string {
  return partesDeFecha(fechaIso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// "2026-10-29T18:24:00Z" → "15:24"
export function formatearHora(fechaIso: string): string {
  return partesDeFecha(fechaIso, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

// "2026-10-29T18:24:00Z" → "29/10/2026 15:24"
export function formatearFechaHora(fechaIso: string): string {
  return `${formatearFecha(fechaIso)} ${formatearHora(fechaIso)}`;
}

// Documento sin puntos ni guiones → con el formato de cada tipo.
// DNI: "28456123" → "28.456.123"; CUIT: "20284561239" → "20-28456123-9".
export function formatearDocumento(tipo: "DNI" | "CUIT", numero: string): string {
  const digitos = numero.replace(/\D/g, "");

  if (tipo === "CUIT" && digitos.length === 11) {
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  }
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// (1, 1233) → "0001-00001233"
export function formatearNumeroFactura(puntoVenta: number, numero: number): string {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

// Los recibos tienen su propia numeración: (1, 341) → "R 0001-00000341"
export function formatearNumeroRecibo(puntoVenta: number, numero: number): string {
  return `R ${formatearNumeroFactura(puntoVenta, numero)}`;
}

// "12.345,50" → 1234550. Es lo que se escribe en los campos de importe.
// Los puntos son separadores de miles y la coma separa los centavos.
// Devuelve null si el texto no es un importe válido.
export function pesosACentavos(texto: string): number | null {
  const limpio = texto.replace(/\./g, "").replace(",", ".").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100);
}

// 1234550 → "12345,50". Para precargar un campo de importe al editar.
export function centavosATexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// Los filtros por día ("2026-10-29") se interpretan en hora de Argentina (UTC-3,
// sin horario de verano). Estas dos funciones los pasan al rango UTC que se guarda
// en la base: desde las 00:00 de ese día hasta las 00:00 del siguiente.
export function inicioDelDia(dia: string): string {
  return new Date(`${dia}T00:00:00-03:00`).toISOString().replace(".000Z", "Z");
}

export function inicioDelDiaSiguiente(dia: string): string {
  const fecha = new Date(`${dia}T00:00:00-03:00`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().replace(".000Z", "Z");
}

// El día de hoy en Argentina como "2026-11-14". El tablero cuenta "hoy" y "el mes" con
// el calendario argentino, no con el de UTC (a las 22:00 de allá ya es el día siguiente en UTC).
export function hoyEnArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(new Date());
}

// "2026-11-14" + 3 → "2026-11-17". Son días de calendario: no depende de ninguna zona horaria.
export function sumarDias(dia: string, dias: number): string {
  const fecha = new Date(`${dia}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

// "2026-11-14" → "14/11". Para los ejes de los gráficos.
export function formatearDia(dia: string): string {
  const [, mes, numero] = dia.split("-");
  return `${numero}/${mes}`;
}

// 1234550 → "$ 12 mil"; 150000000 → "$ 1,5 M". Importes cortos para los ejes de los gráficos.
export function formatearMonedaCorta(centavos: number): string {
  const pesos = centavos / 100;
  const corto = (numero: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(numero);
  if (pesos >= 1_000_000) return `$ ${corto(pesos / 1_000_000)} M`;
  if (pesos >= 1_000) return `$ ${corto(pesos / 1_000)} mil`;
  return `$ ${corto(pesos)}`;
}

// "noviembre de 2026": el mes en curso, en hora de Argentina.
export function mesActual(): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_ARGENTINA, month: "long", year: "numeric" }).format(new Date());
}

// "sábado, 14 de noviembre": la fecha de hoy, en hora de Argentina.
export function fechaDeHoyLarga(): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_ARGENTINA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

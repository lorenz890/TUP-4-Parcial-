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

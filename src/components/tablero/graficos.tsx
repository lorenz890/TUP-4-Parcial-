"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Tooltip,
  LinearScale,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { NOMBRES_FORMA_DE_PAGO } from "@/esquemas/valores";
import { formatearDia, formatearMoneda, formatearMonedaCorta } from "@/lib/formatos";

// Chart.js solo dibuja lo que se registra acá: barras, la dona, los ejes y los avisos.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip);

// Colores de las tres formas de pago. Se usan también en la leyenda de la dona.
export const COLORES_FORMA_DE_PAGO = {
  contado: "#0f766e",
  tarjeta: "#d97706",
  cuenta_corriente: "#64748b",
} as const;

const COLOR_BARRA = "rgba(15, 118, 110, 0.35)";
const COLOR_HOY = "#0f766e";

// RF-T2: ventas de los últimos 30 días. La barra de hoy va más oscura.
export function GraficoVentasDiarias({ dias }: { dias: { fecha: string; importe: number }[] }) {
  const opciones: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (punto) => formatearMoneda(punto.parsed.y ?? 0) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { beginAtZero: true, ticks: { callback: (valor) => formatearMonedaCorta(Number(valor)) } },
    },
  };

  return (
    <div className="relative h-72" role="img" aria-label="Ventas diarias de los últimos 30 días">
      <Bar
        options={opciones}
        data={{
          labels: dias.map((dia) => formatearDia(dia.fecha)),
          datasets: [
            {
              data: dias.map((dia) => dia.importe),
              backgroundColor: dias.map((_, posicion) => (posicion === dias.length - 1 ? COLOR_HOY : COLOR_BARRA)),
              borderRadius: 3,
            },
          ],
        }}
      />
    </div>
  );
}

// RF-T2: ventas del mes por forma de pago, en una dona con el total en el centro y la
// leyenda al costado (porcentaje e importe de cada forma).
export function GraficoFormasDePago({
  formas,
}: {
  formas: { forma: keyof typeof COLORES_FORMA_DE_PAGO; importe: number }[];
}) {
  const total = formas.reduce((suma, fila) => suma + fila.importe, 0);

  const opciones: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (parte) => formatearMoneda(parte.parsed) } },
    },
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-48 w-48" role="img" aria-label="Ventas del mes por forma de pago">
        <Doughnut
          options={opciones}
          data={{
            labels: formas.map((fila) => NOMBRES_FORMA_DE_PAGO[fila.forma]),
            datasets: [
              {
                data: formas.map((fila) => fila.importe),
                backgroundColor: formas.map((fila) => COLORES_FORMA_DE_PAGO[fila.forma]),
                borderWidth: 0,
              },
            ],
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-semibold">{formatearMonedaCorta(total)}</span>
        </div>
      </div>

      <ul className="w-full space-y-1.5 text-sm">
        {formas.map((fila) => (
          <li key={fila.forma} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORES_FORMA_DE_PAGO[fila.forma] }} />
              {NOMBRES_FORMA_DE_PAGO[fila.forma]}
            </span>
            <span className="text-muted-foreground">
              {total > 0 ? Math.round((fila.importe / total) * 100) : 0}%
            </span>
            <span className="font-medium">{formatearMoneda(fila.importe)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

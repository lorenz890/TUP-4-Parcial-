import { Fila, Pila } from "@/components/maquetacion";
import { BarraSuperior } from "@/components/sistema/barra-superior";
import { PanelLateral } from "@/components/sistema/panel-lateral";
import { exigirUsuario } from "@/lib/sesion";

// Estructura común de todas las pantallas (panel lateral + barra superior).
// Barra 2 de la sección 10.5: si no hay un usuario válido, vuelve al login.
// `print:hidden` oculta los menús al imprimir un comprobante.
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();

  return (
    <Fila className="min-h-screen flex-nowrap items-stretch gap-0">
      <aside className="hidden w-60 shrink-0 border-r md:block print:hidden">
        <PanelLateral rol={usuario.rol} />
      </aside>
      <Pila className="min-w-0 flex-1 gap-0">
        <div className="print:hidden">
          <BarraSuperior usuario={usuario} />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </Pila>
    </Fila>
  );
}

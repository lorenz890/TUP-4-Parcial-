import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Pila, Texto } from "@/components/maquetacion";
import { exigirUsuario } from "@/lib/sesion";

// Página provisoria: el tablero real se hace en la etapa 10.
export default async function Inicio() {
  const usuario = await exigirUsuario();

  return (
    <Pila>
      <EncabezadoPagina titulo={`Hola, ${usuario.nombre}`} />
      <Texto className="text-muted-foreground">El tablero con indicadores llega más adelante.</Texto>
    </Pila>
  );
}

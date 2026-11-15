import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Pila } from "@/components/maquetacion";
import { NuevaVenta } from "@/components/ventas/nueva-venta";
import { exigirUsuario } from "@/lib/sesion";
import { proximoNumero } from "@/servicios/facturas";

// RF-V1 a RF-V5: la venta se arma en una sola pantalla y se confirma con la API.
export default async function PaginaNuevaVenta() {
  const usuario = await exigirUsuario();
  const { numeroFormateado } = await proximoNumero(usuario);

  return (
    <Pila>
      <EncabezadoPagina
        titulo="Nueva venta"
        descripcion="El número se asigna al confirmar. Se opera con el teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar."
      />
      <NuevaVenta vendedor={usuario.nombre} proximoNumero={numeroFormateado} />
    </Pila>
  );
}

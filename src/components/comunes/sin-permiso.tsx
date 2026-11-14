import Link from "next/link";
import { Pila, Texto, Titulo } from "@/components/maquetacion";
import { buttonVariants } from "@/components/ui/button";

// Lo que ve un vendedor si abre a mano una pantalla de administrador. La barrera
// real es el servicio (403); esto solo da un mensaje claro en lugar de una pantalla rota.
export function SinPermiso() {
  return (
    <Pila className="items-center py-16 text-center">
      <Titulo>No tenés permiso</Titulo>
      <Texto className="text-muted-foreground">Esta pantalla es solo para administradores.</Texto>
      <Link href="/" className={buttonVariants()}>
        Volver al inicio
      </Link>
    </Pila>
  );
}

import { Badge } from "@/components/ui/badge";

// Insignia de estado: la misma para usuarios, productos y clientes.
export function InsigniaEstado({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "default" : "secondary"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}

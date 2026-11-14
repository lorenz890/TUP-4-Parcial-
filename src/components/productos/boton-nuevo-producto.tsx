"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type Categoria, DialogoProducto } from "./dialogo-producto";

export function BotonNuevoProducto({ categorias }: { categorias: Categoria[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Nuevo producto</Button>
      <DialogoProducto abierto={abierto} alCambiar={setAbierto} categorias={categorias} />
    </>
  );
}

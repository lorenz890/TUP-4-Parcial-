"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogoCategoria } from "./dialogo-categoria";

export function BotonNuevaCategoria() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Nueva categoría</Button>
      <DialogoCategoria abierto={abierto} alCambiar={setAbierto} />
    </>
  );
}

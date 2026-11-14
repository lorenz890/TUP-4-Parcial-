"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogoCliente } from "./dialogo-cliente";

export function BotonNuevoCliente() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Nuevo cliente</Button>
      <DialogoCliente abierto={abierto} alCambiar={setAbierto} />
    </>
  );
}

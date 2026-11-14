"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogoUsuario } from "./dialogo-usuario";

export function BotonNuevoUsuario() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Nuevo usuario</Button>
      <DialogoUsuario abierto={abierto} alCambiar={setAbierto} />
    </>
  );
}

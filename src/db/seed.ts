// Datos iniciales (`pnpm run db:seed`), en tres pasos:
//   1. El primer administrador (RF-U3), con el email y la contraseña del entorno.
//   2. El vendedor de prueba (el segundo usuario, uno por rol).
//   3. Los datos de prueba (categorías, productos, clientes, facturas...) de datos-de-prueba.ts.
// Se puede correr más de una vez: lo que ya existe no se repite ni se pisa.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { crearUsuario } from "@/servicios/usuarios";
import { db } from "./conexion";
import { cargarDatosDePrueba } from "./datos-de-prueba";
import { usuarios } from "./esquema";

async function buscarUsuario(email: string): Promise<UsuarioAutenticado | null> {
  const [fila] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  return fila ? { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol } : null;
}

async function asegurarAdministrador(): Promise<UsuarioAutenticado> {
  // El correo y la clave vienen del entorno para que no queden escritos en el código.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("Falta ADMIN_EMAIL en el entorno (.env).");
  }

  const existente = await buscarUsuario(email);
  if (existente) {
    console.log(`El administrador ${email} ya existe, no se crea de nuevo.`);
    return existente;
  }

  const contrasena = process.env.ADMIN_PASSWORD;
  if (!contrasena) {
    throw new Error("Falta ADMIN_PASSWORD en el entorno (.env).");
  }
  // Misma regla que el cambio de contraseña (sección 11.3).
  if (contrasena.length < 8) {
    throw new Error("ADMIN_PASSWORD tiene que tener al menos 8 caracteres.");
  }

  // Es el primero: todavía no hay un administrador que pueda crearlo con el servicio de usuarios.
  const [creado] = await db
    .insert(usuarios)
    .values({
      email,
      nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
      hashContrasena: await bcrypt.hash(contrasena, 10),
      rol: "admin",
    })
    .returning();
  console.log(`Administrador ${email} creado.`);
  return { id: creado.id, nombre: creado.nombre, email: creado.email, rol: creado.rol };
}

async function asegurarVendedor(admin: UsuarioAutenticado): Promise<UsuarioAutenticado> {
  const email = process.env.VENDEDOR_EMAIL?.trim().toLowerCase();
  const contrasena = process.env.VENDEDOR_PASSWORD;
  if (!email || !contrasena) {
    throw new Error("Faltan VENDEDOR_EMAIL y VENDEDOR_PASSWORD en el entorno (.env).");
  }

  const existente = await buscarUsuario(email);
  if (existente) {
    console.log(`El vendedor ${email} ya existe, no se crea de nuevo.`);
    return existente;
  }

  // Ya hay un administrador: el vendedor se crea con el mismo servicio que usa la pantalla de usuarios.
  const creado = await crearUsuario(admin, {
    nombre: process.env.VENDEDOR_NOMBRE ?? "Vendedor",
    email,
    rol: "vendedor",
    password: contrasena,
  });
  console.log(`Vendedor ${email} creado.`);
  return { id: creado.id, nombre: creado.nombre, email: creado.email, rol: creado.rol };
}

async function main() {
  const admin = await asegurarAdministrador();
  const vendedor = await asegurarVendedor(admin);
  await cargarDatosDePrueba(admin, vendedor);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

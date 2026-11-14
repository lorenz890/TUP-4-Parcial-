// Datos iniciales. Por ahora solo crea el primer administrador (RF-U3);
// los datos de prueba completos se agregan en la etapa 11.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./conexion";
import { usuarios } from "./esquema";

async function crearPrimerAdministrador() {
  const email = process.env.ADMIN_EMAIL;
  const contrasena = process.env.ADMIN_PASSWORD;

  // El correo y la clave vienen del entorno para que no queden escritos en el código.
  if (!email || !contrasena) {
    throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD en el entorno (.env).");
  }
  // Misma regla que el cambio de contraseña (sección 11.3).
  if (contrasena.length < 8) {
    throw new Error("ADMIN_PASSWORD tiene que tener al menos 8 caracteres.");
  }

  // El seed se puede correr más de una vez sin duplicar ni pisar al administrador.
  const existente = await db.select().from(usuarios).where(eq(usuarios.email, email));
  if (existente.length > 0) {
    console.log(`El administrador ${email} ya existe, no se hace nada.`);
    return;
  }

  await db.insert(usuarios).values({
    email,
    nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
    hashContrasena: await bcrypt.hash(contrasena, 10),
    rol: "admin",
  });
  console.log(`Administrador ${email} creado.`);
}

crearPrimerAdministrador().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

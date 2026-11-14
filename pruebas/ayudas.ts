import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { expect } from "vitest";
import { db } from "@/db/conexion";
import { productos, usuarios } from "@/db/esquema";
import { aApiError } from "@/lib/api-error";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { crearCategoria } from "@/servicios/categorias";
import { crearCliente } from "@/servicios/clientes";
import { crearProducto } from "@/servicios/productos";

// Todas las pruebas comparten una misma base temporal. Para que no choquen entre sí,
// cada dato de prueba lleva un texto al azar (códigos, emails, documentos).
const azar = () => randomUUID().slice(0, 8);

// Un usuario real en la base temporal (las claves foráneas lo exigen). Su contraseña no
// sirve para iniciar sesión: las pruebas llaman a los servicios directamente.
export async function crearUsuarioDePrueba(rol: UsuarioAutenticado["rol"]): Promise<UsuarioAutenticado> {
  const [fila] = await db
    .insert(usuarios)
    .values({
      email: `${azar()}@prueba.test`,
      nombre: `${rol} ${azar()}`,
      hashContrasena: "no-sirve-para-entrar",
      rol,
    })
    .returning();
  return { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol };
}

// Un producto creado por el servicio real, con su stock inicial como ingreso.
export async function crearProductoDePrueba(
  admin: UsuarioAutenticado,
  { existencia = 10, precio = 100000 }: { existencia?: number; precio?: number } = {},
) {
  const categoria = await crearCategoria(admin, { nombre: `Categoría ${azar()}` });
  return crearProducto(admin, {
    codigo: `T-${azar()}`,
    descripcion: `Producto ${azar()}`,
    categoriaId: categoria.id,
    precio,
    stockMinimo: 0,
    stockInicial: existencia,
  });
}

export async function crearClienteDePrueba(
  usuario: UsuarioAutenticado,
  { cuentaCorriente = false, limiteCredito = null }: { cuentaCorriente?: boolean; limiteCredito?: number | null } = {},
) {
  return crearCliente(usuario, {
    tipoDoc: "DNI",
    nroDoc: String(10_000_000 + Math.floor(Math.random() * 89_999_999)),
    nombre: `Cliente ${azar()}`,
    cuentaCorriente,
    limiteCredito,
  });
}

export async function existenciaDe(productoId: number) {
  const [fila] = await db
    .select({ existencia: productos.existencia })
    .from(productos)
    .where(eq(productos.id, productoId));
  return fila.existencia;
}

// Cuántas filas hay en las tablas que toca una venta. Sirve para comprobar que una
// operación que falla no dejó NADA grabado.
export async function contarFilas() {
  const [fila] = await db.all<{ facturas: number; renglones: number; stock: number; cuenta: number }>(sql`
    select
      (select count(*) from facturas) as facturas,
      (select count(*) from factura_items) as renglones,
      (select count(*) from movimientos_stock) as stock,
      (select count(*) from movimientos_cuenta) as cuenta`);
  return fila;
}

// Verifica que una operación falle, convirtiendo el error igual que lo hace el envoltorio
// de las rutas (aApiError): un error de validación de zod llega como 422 VALIDACION.
// Uso: await rechazo(servicio(...)).toMatchObject({ status: 409, code: "..." })
export function rechazo(operacion: Promise<unknown>) {
  return expect(
    operacion.catch((error) => {
      throw aApiError(error);
    }),
  ).rejects;
}

// Lanza una operación y devuelve su resultado o su error, sin cortar el flujo. Permite
// armar las dos ventas simultáneas con Promise.all y mirar después cuál ganó.
export async function intentar<T>(operacion: () => Promise<T>) {
  try {
    return { ok: true as const, valor: await operacion() };
  } catch (error) {
    return { ok: false as const, error };
  }
}

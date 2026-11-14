import { describe, expect, it } from "vitest";
import { anularFactura, confirmarFactura, obtenerFactura } from "@/servicios/facturas";
import { crearCategoria, editarCategoria, listarCategorias } from "@/servicios/categorias";
import { editarProducto, crearProducto, listarProductos } from "@/servicios/productos";
import { registrarMovimientoManual } from "@/servicios/stock";
import {
  crearUsuario,
  editarUsuario,
  listarUsuarios,
  restablecerContrasena,
} from "@/servicios/usuarios";
import {
  contarFilas,
  crearProductoDePrueba,
  crearUsuarioDePrueba,
  existenciaDe,
  rechazo,
} from "./ayudas";

// Lista de control 10.8, punto 2: un vendedor que llama directamente a una operación de
// administrador recibe 403. La regla vive en cada servicio (exigirAdmin), que es lo que
// llaman tanto las rutas de la API como las pantallas. Cada pedido de abajo es VÁLIDO: se
// valida primero y se verifica el rol después, así que un pedido inválido daría 422 antes.
const admin = await crearUsuarioDePrueba("admin");
const vendedor = await crearUsuarioDePrueba("vendedor");

const operacionesDeAdministrador: [string, () => Promise<unknown>][] = [
  ["POST /api/facturas/{id}/anulacion", () => anularFactura(vendedor, 1, { motivo: "Prueba" })],
  [
    "POST /api/productos",
    () => crearProducto(vendedor, { codigo: "X-1", descripcion: "X", categoriaId: 1, precio: 100 }),
  ],
  ["PATCH /api/productos/{id}", () => editarProducto(vendedor, 1, { precio: 100 })],
  [
    "POST /api/productos/{id}/movimientos",
    () => registrarMovimientoManual(vendedor, 1, { tipo: "egreso", cantidad: 1, motivo: "Rotura" }),
  ],
  ["GET /api/productos?activo=todos", () => listarProductos(vendedor, { activo: "todos" })],
  ["POST /api/categorias", () => crearCategoria(vendedor, { nombre: "Nueva" })],
  ["PATCH /api/categorias/{id}", () => editarCategoria(vendedor, 1, { nombre: "Otra" })],
  ["GET /api/categorias?activa=todas", () => listarCategorias(vendedor, { activa: "todas" })],
  ["GET /api/usuarios", () => listarUsuarios(vendedor, {})],
  [
    "POST /api/usuarios",
    () => crearUsuario(vendedor, { nombre: "X", email: "x@x.test", rol: "admin", password: "12345678" }),
  ],
  ["PATCH /api/usuarios/{id}", () => editarUsuario(vendedor, 1, { rol: "admin" })],
  ["POST /api/usuarios/{id}/reset-password", () => restablecerContrasena(vendedor, 1)],
];

describe("un vendedor no puede usar las operaciones de administrador (403)", () => {
  it.each(operacionesDeAdministrador)("%s", async (_ruta, operacion) => {
    await rechazo(operacion()).toMatchObject({ status: 403, code: "SIN_PERMISO" });
  });

  it("y el intento no cambia nada: la factura sigue emitida y el stock intacto", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10 });
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 3 }],
      pago: { forma: "contado" },
    });
    const antes = await contarFilas();

    await rechazo(anularFactura(vendedor, factura.id, { motivo: "Quiero anularla" })).toMatchObject({
      status: 403,
    });

    expect(await contarFilas()).toEqual(antes);
    expect((await obtenerFactura(vendedor, factura.id)).estado).toBe("emitida");
    expect(await existenciaDe(producto.id)).toBe(7);
  });

  it("en cambio el administrador sí puede anular", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10 });
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 3 }],
      pago: { forma: "contado" },
    });

    const anulada = await anularFactura(admin, factura.id, { motivo: "Prueba de permisos" });
    expect(anulada.estado).toBe("anulada");
    expect(await existenciaDe(producto.id)).toBe(10);
  });
});

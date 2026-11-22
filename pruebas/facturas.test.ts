import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/conexion";
import { facturas, movimientosCuenta, movimientosStock } from "@/db/esquema";
import { ApiError } from "@/lib/api-error";
import { calcularSaldo, crearCliente, editarCliente } from "@/servicios/clientes";
import { anularFactura, confirmarFactura, listarFacturas, obtenerFactura, proximoNumero } from "@/servicios/facturas";
import { registrarPago } from "@/servicios/pagos";
import { editarProducto } from "@/servicios/productos";
import { moverStock } from "@/servicios/stock";
import {
  contarFilas,
  crearClienteDePrueba,
  crearProductoDePrueba,
  crearUsuarioDePrueba,
  existenciaDe,
  intentar,
  rechazo,
} from "./ayudas";

// moverStock es la función real, pero envuelta en un espía: así, en UNA prueba, se puede
// hacer que falle a mitad de la venta para comprobar que se deshace todo.
vi.mock("@/servicios/stock", async (importarOriginal) => {
  const original = await importarOriginal<typeof import("@/servicios/stock")>();
  return { ...original, moverStock: vi.fn(original.moverStock) };
});

const admin = await crearUsuarioDePrueba("admin");
const vendedor = await crearUsuarioDePrueba("vendedor");
const otroVendedor = await crearUsuarioDePrueba("vendedor");

const contadoSimple = { forma: "contado" } as const;

describe("confirmar una factura (RF-V6)", () => {
  it("descuenta el stock, toma el precio del servidor y asigna el número al confirmar", async () => {
    const a = await crearProductoDePrueba(admin, { existencia: 10, precio: 150000 });
    const b = await crearProductoDePrueba(admin, { existencia: 5, precio: 20000 });
    const { numeroFormateado: esperado } = await proximoNumero(vendedor);

    const factura = await confirmarFactura(vendedor, {
      clienteId: null,
      items: [
        { productoId: a.id, cantidad: 2 },
        { productoId: b.id, cantidad: 1 },
      ],
      pago: { forma: "contado", montoRecibido: 400000 },
    });

    expect(factura.numeroFormateado).toBe(esperado);
    expect(factura.estado).toBe("emitida");
    expect(factura.cliente).toBeNull(); // consumidor final
    expect(factura.vendedor.id).toBe(vendedor.id);
    expect(factura.total).toBe(2 * 150000 + 20000);
    expect(factura.pago).toEqual({ forma: "contado", montoRecibido: 400000, vuelto: 80000 });
    expect(factura.items).toMatchObject([
      { productoId: a.id, descripcion: a.descripcion, cantidad: 2, precioUnitario: 150000, subtotal: 300000 },
      { productoId: b.id, descripcion: b.descripcion, cantidad: 1, precioUnitario: 20000, subtotal: 20000 },
    ]);

    expect(await existenciaDe(a.id)).toBe(8);
    expect(await existenciaDe(b.id)).toBe(4);

    // Regla 2: cada renglón dejó su movimiento de venta, con la existencia que quedó.
    const movimientos = await db
      .select()
      .from(movimientosStock)
      .where(eq(movimientosStock.facturaId, factura.id))
      .orderBy(movimientosStock.id);
    expect(movimientos).toMatchObject([
      { productoId: a.id, tipo: "venta", cantidad: -2, existenciaResultante: 8, usuarioId: vendedor.id },
      { productoId: b.id, tipo: "venta", cantidad: -1, existenciaResultante: 4, usuarioId: vendedor.id },
    ]);
  });

  it("el precio se congela: cambiar el catálogo después no altera la factura (regla 3)", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 5, precio: 50000 });
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 2 }],
      pago: contadoSimple,
    });

    await editarProducto(admin, producto.id, { precio: 999999, descripcion: "Otra descripción" });

    const releida = await obtenerFactura(vendedor, factura.id);
    expect(releida.items[0]).toMatchObject({ precioUnitario: 50000, descripcion: producto.descripcion });
    expect(releida.total).toBe(100000);
  });

  it("los precios los pone el servidor: un campo de precio en el pedido se rechaza", async () => {
    const producto = await crearProductoDePrueba(admin);
    const antes = await contarFilas();

    await rechazo(
      confirmarFactura(vendedor, {
        items: [{ productoId: producto.id, cantidad: 1, precioUnitario: 1 }],
        pago: contadoSimple,
      }),
    ).toMatchObject({ status: 422, code: "VALIDACION" });

    expect(await contarFilas()).toEqual(antes);
  });

  it("la numeración es correlativa y una venta rechazada no gasta número (regla 4)", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 3 });

    const primera = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: contadoSimple,
    });
    // Esta se rechaza (pide más de lo que hay) y NO debe consumir el número siguiente.
    await rechazo(
      confirmarFactura(vendedor, { items: [{ productoId: producto.id, cantidad: 50 }], pago: contadoSimple }),
    ).toMatchObject({ code: "STOCK_INSUFICIENTE" });
    const segunda = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: contadoSimple,
    });

    expect(segunda.numero).toBe(primera.numero + 1); // sin huecos
  });
});

describe("una venta que no se puede completar no deja datos parciales", () => {
  it("sin stock en un renglón: 409 con el detalle de cada producto y nada grabado", async () => {
    const hay = await crearProductoDePrueba(admin, { existencia: 10 });
    const falta1 = await crearProductoDePrueba(admin, { existencia: 2 });
    const falta2 = await crearProductoDePrueba(admin, { existencia: 0 });
    const antes = await contarFilas();

    await rechazo(
      confirmarFactura(vendedor, {
        items: [
          { productoId: hay.id, cantidad: 3 },
          { productoId: falta1.id, cantidad: 5 },
          { productoId: falta2.id, cantidad: 1 },
        ],
        pago: contadoSimple,
      }),
    ).toMatchObject({
      status: 409,
      code: "STOCK_INSUFICIENTE",
      details: [
        { productoId: falta1.id, solicitado: 5, disponible: 2 },
        { productoId: falta2.id, solicitado: 1, disponible: 0 },
      ],
    });

    expect(await contarFilas()).toEqual(antes);
    expect(await existenciaDe(hay.id)).toBe(10); // el que sí alcanzaba tampoco se tocó
  });

  it("si falla a mitad de camino (en el 2.º renglón, ya grabados la factura y el 1.º) se deshace TODO", async () => {
    const a = await crearProductoDePrueba(admin, { existencia: 10 });
    const b = await crearProductoDePrueba(admin, { existencia: 10 });
    const antes = await contarFilas();
    const numeroAntes = (await proximoNumero(vendedor)).numeroFormateado;

    // El 1.er moverStock funciona (graba stock y movimiento); el 2.º revienta.
    const { moverStock: real } = await vi.importActual<typeof import("@/servicios/stock")>("@/servicios/stock");
    vi.mocked(moverStock)
      .mockImplementationOnce(real)
      .mockImplementationOnce(async () => {
        throw new Error("falla simulada a mitad de la venta");
      });

    await expect(
      confirmarFactura(vendedor, {
        items: [
          { productoId: a.id, cantidad: 1 },
          { productoId: b.id, cantidad: 1 },
        ],
        pago: contadoSimple,
      }),
    ).rejects.toThrow("falla simulada");

    // Ni la factura, ni los renglones, ni el descuento del 1.er producto, ni su movimiento.
    expect(await contarFilas()).toEqual(antes);
    expect(await existenciaDe(a.id)).toBe(10);
    expect(await existenciaDe(b.id)).toBe(10);
    expect((await proximoNumero(vendedor)).numeroFormateado).toBe(numeroAntes); // el número quedó libre
  });
});

describe("moverStock es la garantía final contra vender lo que ya no hay", () => {
  it("aunque la revisión previa pase, el UPDATE condicionado rechaza el descuento y se deshace todo", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 1 });
    const antes = await contarFilas();

    // Simula que OTRA venta se queda con la última unidad después de que esta pasó la
    // revisión previa (paso 3) y antes de que descuente (paso 8). Se hace con el mismo
    // moverStock, dentro de la misma transacción, así que es una simulación.
    const { moverStock: real } = await vi.importActual<typeof import("@/servicios/stock")>("@/servicios/stock");
    vi.mocked(moverStock).mockImplementationOnce(async (tx, datos) => {
      await real(tx, { ...datos, usuarioId: otroVendedor.id, motivo: "Venta simulada de otro vendedor" });
      return real(tx, datos);
    });

    await rechazo(
      confirmarFactura(vendedor, {
        items: [{ productoId: producto.id, cantidad: 1 }],
        pago: contadoSimple,
      }),
    ).toMatchObject({
      status: 409,
      code: "STOCK_INSUFICIENTE",
      details: [{ productoId: producto.id, solicitado: 1, disponible: 0 }],
    });

    expect(await contarFilas()).toEqual(antes);
    expect(await existenciaDe(producto.id)).toBe(1);
  });
});

describe("dos ventas simultáneas de la última unidad (lista 10.8, punto 4)", () => {
  it("solo una se confirma: la otra recibe STOCK_INSUFICIENTE (5 rondas, lanzadas con Promise.all)", async () => {
    for (let ronda = 1; ronda <= 5; ronda++) {
      const producto = await crearProductoDePrueba(admin, { existencia: 1 });
      const pedido = { items: [{ productoId: producto.id, cantidad: 1 }], pago: contadoSimple };

      // Las dos ventas se lanzan al mismo tiempo, no una después de la otra.
      const [ventaA, ventaB] = await Promise.all([
        intentar(() => confirmarFactura(vendedor, pedido)),
        intentar(() => confirmarFactura(otroVendedor, pedido)),
      ]);

      const confirmadas = [ventaA, ventaB].filter((venta) => venta.ok);
      const rechazadas = [ventaA, ventaB].filter((venta) => !venta.ok);
      expect(confirmadas, `ronda ${ronda}: una sola factura confirmada`).toHaveLength(1);
      expect(rechazadas, `ronda ${ronda}: una sola rechazada`).toHaveLength(1);

      const error = rechazadas[0].error;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 409, code: "STOCK_INSUFICIENTE" });

      expect(await existenciaDe(producto.id)).toBe(0);
      const ventas = await db
        .select()
        .from(movimientosStock)
        .where(eq(movimientosStock.productoId, producto.id));
      // El ingreso inicial y UNA sola venta: nada de unidades vendidas de más.
      expect(ventas.filter((movimiento) => movimiento.tipo === "venta")).toHaveLength(1);
    }
  });
});

describe("formas de pago (RF-V5, reglas 6, 7 y 9)", () => {
  it("contado: si el monto recibido no cubre el total, 422 MONTO_INSUFICIENTE", async () => {
    const producto = await crearProductoDePrueba(admin, { precio: 100000 });
    const antes = await contarFilas();

    await rechazo(
      confirmarFactura(vendedor, {
        items: [{ productoId: producto.id, cantidad: 2 }],
        pago: { forma: "contado", montoRecibido: 199999 },
      }),
    ).toMatchObject({ status: 422, code: "MONTO_INSUFICIENTE" });

    expect(await contarFilas()).toEqual(antes);
  });

  it("tarjeta: guarda solo tipo, marca y últimos 4; un número completo se rechaza", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10 });
    const items = [{ productoId: producto.id, cantidad: 1 }];

    const factura = await confirmarFactura(vendedor, {
      items,
      pago: { forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "4242" } },
    });
    expect(factura.pago).toEqual({
      forma: "tarjeta",
      tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "4242" },
    });

    // Un campo "numero" que no está previsto, o 16 dígitos en ultimos4: ambos se rechazan.
    const antes = await contarFilas();
    await rechazo(
      confirmarFactura(vendedor, {
        items,
        pago: {
          forma: "tarjeta",
          tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "4242", numero: "4242424242424242" },
        },
      }),
    ).toMatchObject({ status: 422, code: "VALIDACION" });
    await rechazo(
      confirmarFactura(vendedor, {
        items,
        pago: { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "4242424242424242" } },
      }),
    ).toMatchObject({ status: 422, code: "VALIDACION" });
    expect(await contarFilas()).toEqual(antes);
  });

  it("cuenta corriente: consumidor final y cliente no habilitado no pueden comprar a cuenta (regla 6)", async () => {
    const producto = await crearProductoDePrueba(admin);
    const sinCuenta = await crearClienteDePrueba(vendedor, { cuentaCorriente: false });
    const items = [{ productoId: producto.id, cantidad: 1 }];
    const antes = await contarFilas();

    await rechazo(
      confirmarFactura(vendedor, { clienteId: null, items, pago: { forma: "cuenta_corriente" } }),
    ).toMatchObject({ status: 422, code: "CUENTA_CORRIENTE_NO_HABILITADA" });
    await rechazo(
      confirmarFactura(vendedor, { clienteId: sinCuenta.id, items, pago: { forma: "cuenta_corriente" } }),
    ).toMatchObject({ status: 422, code: "CUENTA_CORRIENTE_NO_HABILITADA" });

    expect(await contarFilas()).toEqual(antes);
  });

  it("cuenta corriente: graba el débito y respeta el límite de crédito (regla 7)", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 20, precio: 10000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true, limiteCredito: 100000 });
    const comprar = (cantidad: number) =>
      confirmarFactura(vendedor, {
        clienteId: cliente.id,
        items: [{ productoId: producto.id, cantidad }],
        pago: { forma: "cuenta_corriente" },
      });

    const primera = await comprar(8); // $ 800,00 de un límite de $ 1.000,00
    expect(primera.saldoCliente).toBe(80000);
    expect(await calcularSaldo(db, cliente.id)).toBe(80000);

    const antes = await contarFilas();
    await rechazo(comprar(3)).toMatchObject({
      status: 422,
      code: "LIMITE_CREDITO_EXCEDIDO",
      details: { saldoActual: 80000, limite: 100000, excedente: 10000 },
    });
    expect(await contarFilas()).toEqual(antes);
    expect(await existenciaDe(producto.id)).toBe(12); // solo se descontó la primera venta (20 - 8)
  });

  it("rechaza un producto dado de baja, productos repetidos y una venta sin renglones", async () => {
    const baja = await crearProductoDePrueba(admin);
    await editarProducto(admin, baja.id, { activo: false });
    const activo = await crearProductoDePrueba(admin);
    const antes = await contarFilas();

    await rechazo(
      confirmarFactura(vendedor, { items: [{ productoId: baja.id, cantidad: 1 }], pago: contadoSimple }),
    ).toMatchObject({ status: 422, code: "PRODUCTO_INACTIVO" });
    await rechazo(
      confirmarFactura(vendedor, {
        items: [
          { productoId: activo.id, cantidad: 1 },
          { productoId: activo.id, cantidad: 1 },
        ],
        pago: contadoSimple,
      }),
    ).toMatchObject({ status: 422, code: "VALIDACION" });
    await rechazo(confirmarFactura(vendedor, { items: [], pago: contadoSimple })).toMatchObject({
      status: 422,
      code: "VALIDACION",
    });

    expect(await contarFilas()).toEqual(antes);
  });
});

describe("anular una factura (RF-V9, reglas 2, 5 y 7)", () => {
  it("reingresa el stock y la factura queda visible como anulada, con quién, cuándo y por qué", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10 });
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 4 }],
      pago: contadoSimple,
    });
    expect(await existenciaDe(producto.id)).toBe(6);

    const anulada = await anularFactura(admin, factura.id, { motivo: "Error en la carga de cantidades" });

    expect(anulada.estado).toBe("anulada");
    expect(anulada.anulacion).toMatchObject({
      usuario: { id: admin.id },
      motivo: "Error en la carga de cantidades",
    });
    expect(anulada.items).toHaveLength(1); // no se borra nada: la factura sigue completa
    expect(await existenciaDe(producto.id)).toBe(10);

    const [movimiento] = await db
      .select()
      .from(movimientosStock)
      .where(eq(movimientosStock.facturaId, factura.id))
      .orderBy(movimientosStock.id)
      .then((filas) => filas.filter((fila) => fila.tipo === "anulacion"));
    expect(movimiento).toMatchObject({ cantidad: 4, existenciaResultante: 10, usuarioId: admin.id });

    // Sigue consultable.
    expect((await obtenerFactura(vendedor, factura.id)).estado).toBe("anulada");
  });

  it("una venta a cuenta corriente anulada deja el saldo como estaba", async () => {
    const producto = await crearProductoDePrueba(admin, { precio: 25000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const factura = await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 2 }],
      pago: { forma: "cuenta_corriente" },
    });
    expect(await calcularSaldo(db, cliente.id)).toBe(50000);

    await anularFactura(admin, factura.id, { motivo: "El cliente devolvió todo" });

    expect(await calcularSaldo(db, cliente.id)).toBe(0);
    const movimientos = await db
      .select()
      .from(movimientosCuenta)
      .where(eq(movimientosCuenta.facturaId, factura.id))
      .orderBy(movimientosCuenta.id);
    expect(movimientos).toMatchObject([
      { tipo: "debito", importe: 50000 },
      { tipo: "credito", importe: 50000 },
    ]);
  });

  it("el motivo es obligatorio y la factura no cambia si falta", async () => {
    const producto = await crearProductoDePrueba(admin);
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: contadoSimple,
    });

    await rechazo(anularFactura(admin, factura.id, {})).toMatchObject({ status: 422, code: "VALIDACION" });
    await rechazo(anularFactura(admin, factura.id, { motivo: "   " })).toMatchObject({
      status: 422,
      code: "VALIDACION",
    });

    expect((await obtenerFactura(admin, factura.id)).estado).toBe("emitida");
  });

  it("no se anula dos veces, ni siquiera dos anulaciones simultáneas: el stock vuelve una sola vez", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10 });
    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 3 }],
      pago: contadoSimple,
    });

    const [una, otra] = await Promise.all([
      intentar(() => anularFactura(admin, factura.id, { motivo: "Primera" })),
      intentar(() => anularFactura(admin, factura.id, { motivo: "Segunda" })),
    ]);

    expect([una, otra].filter((anulacion) => anulacion.ok)).toHaveLength(1);
    const rechazada = [una, otra].find((anulacion) => !anulacion.ok)!;
    expect(rechazada.error).toMatchObject({ status: 409, code: "FACTURA_ANULADA" });
    expect(await existenciaDe(producto.id)).toBe(10); // 10 - 3 + 3, no 13

    await rechazo(anularFactura(admin, factura.id, { motivo: "Tercera" })).toMatchObject({
      status: 409,
      code: "FACTURA_ANULADA",
    });
  });

  it("anular una factura inexistente es 404, y el número de una anulada no se reutiliza", async () => {
    await rechazo(anularFactura(admin, 99999999, { motivo: "No existe" })).toMatchObject({
      status: 404,
      code: "NO_ENCONTRADO",
    });

    const producto = await crearProductoDePrueba(admin, { existencia: 5 });
    const pedido = { items: [{ productoId: producto.id, cantidad: 1 }], pago: contadoSimple };
    const primera = await confirmarFactura(vendedor, pedido);
    await anularFactura(admin, primera.id, { motivo: "Prueba" });
    const siguiente = await confirmarFactura(vendedor, pedido);

    expect(siguiente.numero).toBe(primera.numero + 1);
    const [fila] = await db.select().from(facturas).where(eq(facturas.id, primera.id));
    expect(fila.numero).toBe(primera.numero); // la anulada conserva su número
  });
});

describe("anular una venta a cuenta con pagos (regla 8: no hay saldos a favor)", () => {
  it("venta de $2000 y pago de $1500: la anulación se rechaza y no cambia nada", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 200000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const factura = await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: { forma: "cuenta_corriente" },
    });
    await registrarPago(vendedor, cliente.id, { importe: 150000, medio: "efectivo" });
    const antes = await contarFilas();

    await rechazo(anularFactura(admin, factura.id, { motivo: "Error de carga" })).toMatchObject({
      status: 422,
      code: "ANULACION_CON_PAGOS",
    });

    // Nada cambió: la factura sigue emitida, el stock sigue descontado y el saldo es el de antes.
    expect(await contarFilas()).toEqual(antes);
    expect((await obtenerFactura(admin, factura.id)).estado).toBe("emitida");
    expect(await existenciaDe(producto.id)).toBe(9);
    expect(await calcularSaldo(db, cliente.id)).toBe(50000);
  });

  it("venta sin pagos: se anula bien y el saldo vuelve a cero", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 200000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const factura = await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: { forma: "cuenta_corriente" },
    });

    const anulada = await anularFactura(admin, factura.id, { motivo: "Error de carga" });

    expect(anulada.estado).toBe("anulada");
    expect(await existenciaDe(producto.id)).toBe(10);
    expect(await calcularSaldo(db, cliente.id)).toBe(0);
  });

  it("con pagos pero otra deuda que lo cubre, la anulación sí se permite (el saldo no queda negativo)", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 200000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const venta = (cantidad: number) =>
      confirmarFactura(vendedor, {
        clienteId: cliente.id,
        items: [{ productoId: producto.id, cantidad }],
        pago: { forma: "cuenta_corriente" },
      });
    const primera = await venta(1); // $2000
    await venta(2); // $4000 más: la deuda total es $6000
    await registrarPago(vendedor, cliente.id, { importe: 150000, medio: "efectivo" }); // queda $4500

    await anularFactura(admin, primera.id, { motivo: "Error de carga" }); // $4500 - $2000 = $2500

    expect(await calcularSaldo(db, cliente.id)).toBe(250000);
  });
});

describe("el comprobante congela los datos del cliente y del producto (regla 3)", () => {
  it("editar el cliente y el producto después de vender no cambia la factura vieja", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 25000 });
    const cliente = await crearCliente(vendedor, {
      tipoDoc: "DNI",
      nroDoc: String(30_000_000 + Math.floor(Math.random() * 9_999_999)),
      nombre: "Ana Pérez",
      domicilio: "Calle Falsa 123",
      cuentaCorriente: false,
    });
    const factura = await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 2 }],
      pago: contadoSimple,
    });
    const antes = await obtenerFactura(vendedor, factura.id);

    // Después de vender: se cambian el nombre, el documento y el domicilio del cliente, y el
    // código y la descripción del producto.
    await editarCliente(vendedor, cliente.id, {
      nombre: "Ana María Gómez",
      tipoDoc: "DNI", // el tipo y el número de documento se cambian juntos
      nroDoc: String(40_000_000 + Math.floor(Math.random() * 9_999_999)),
      domicilio: "Otra calle 999",
    });
    await editarProducto(admin, producto.id, { codigo: `NUEVO-${Date.now()}`, descripcion: "Descripción nueva" });

    const despues = await obtenerFactura(vendedor, factura.id);
    expect(despues.cliente).toEqual(antes.cliente);
    expect(despues.cliente).toMatchObject({ nombre: "Ana Pérez", domicilio: "Calle Falsa 123" });
    expect(despues.items).toEqual(antes.items);
    expect(despues.items[0].codigo).toBe(factura.items[0].codigo);
    expect(despues.items[0].descripcion).not.toBe("Descripción nueva");

    // El listado tampoco cambia: muestra el nombre copiado, no el actual del cliente.
    const listado = await listarFacturas(vendedor, { clienteId: cliente.id });
    expect(listado.data[0].cliente?.nombre).toBe("Ana Pérez");
  });
});

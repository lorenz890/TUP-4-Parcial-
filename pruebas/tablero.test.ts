import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/conexion";
import { facturas } from "@/db/esquema";
import { hoyEnArgentina, sumarDias } from "@/lib/formatos";
import { anularFactura, confirmarFactura } from "@/servicios/facturas";
import { registrarPago } from "@/servicios/pagos";
import { obtenerTablero } from "@/servicios/tablero";
import {
  crearClienteDePrueba,
  crearProductoDePrueba,
  crearUsuarioDePrueba,
} from "./ayudas";

// RF-T1 a RF-T3. Todas las pruebas comparten una base con datos de otros archivos, así que
// no se comparan totales absolutos: se mira el tablero ANTES y DESPUÉS de una operación conocida
// y se verifica cuánto cambió.
const admin = await crearUsuarioDePrueba("admin");
const vendedor = await crearUsuarioDePrueba("vendedor");

const contado = { forma: "contado" } as const;
const ultimoDia = (tablero: Awaited<ReturnType<typeof obtenerTablero>>) => tablero.ventasDiarias[29];
const forma = (tablero: Awaited<ReturnType<typeof obtenerTablero>>, nombre: string) =>
  tablero.porFormaDePago.find((fila) => fila.forma === nombre)!.importe;

describe("indicadores de hoy y del mes (RF-T1)", () => {
  it("una venta suma a hoy, al mes y al gráfico; anularla lo deja como estaba", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 10000 });
    const antes = await obtenerTablero(vendedor);

    const factura = await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 3 }],
      pago: contado,
    });
    const despues = await obtenerTablero(vendedor);

    expect(despues.hoy.cantidad - antes.hoy.cantidad).toBe(1);
    expect(despues.hoy.importe - antes.hoy.importe).toBe(30000);
    expect(despues.mes.cantidad - antes.mes.cantidad).toBe(1);
    expect(despues.mes.importe - antes.mes.importe).toBe(30000);
    expect(ultimoDia(despues).fecha).toBe(hoyEnArgentina());
    expect(ultimoDia(despues).importe - ultimoDia(antes).importe).toBe(30000);
    expect(forma(despues, "contado") - forma(antes, "contado")).toBe(30000);

    // Solo cuentan las emitidas: al anular, todo vuelve al valor de antes.
    await anularFactura(admin, factura.id, { motivo: "Prueba del tablero" });
    const anulada = await obtenerTablero(vendedor);
    expect(anulada.hoy).toEqual(antes.hoy);
    expect(anulada.mes.importe).toBe(antes.mes.importe);
    expect(ultimoDia(anulada).importe).toBe(ultimoDia(antes).importe);
    expect(forma(anulada, "contado")).toBe(forma(antes, "contado"));
  });

  it("el ticket promedio es el importe del mes dividido la cantidad de facturas", async () => {
    const { mes } = await obtenerTablero(vendedor);
    expect(mes.cantidad).toBeGreaterThan(0);
    expect(mes.ticketPromedio).toBe(Math.round(mes.importe / mes.cantidad));
  });

  it("cuenta el día con el calendario argentino, no con el de UTC", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 10000 });
    const hoy = hoyEnArgentina();
    const ayer = sumarDias(hoy, -1);
    const antes = await obtenerTablero(vendedor);
    const del = (tablero: typeof antes, dia: string) => tablero.ventasDiarias.find((fila) => fila.fecha === dia)!.importe;

    const venta = (cantidad: number) =>
      confirmarFactura(vendedor, { items: [{ productoId: producto.id, cantidad }], pago: contado });
    const tardeDeAyer = await venta(1); // $ 100,00
    const apenasHoy = await venta(2); // $ 200,00

    // 02:00 UTC es la noche anterior en Argentina (23:00); 03:00 UTC es la medianoche de hoy.
    await db.update(facturas).set({ fecha: `${hoy}T02:00:00Z` }).where(eq(facturas.id, tardeDeAyer.id));
    await db.update(facturas).set({ fecha: `${hoy}T03:00:00Z` }).where(eq(facturas.id, apenasHoy.id));
    const despues = await obtenerTablero(vendedor);

    expect(del(despues, ayer) - del(antes, ayer)).toBe(10000); // la de las 23:00 cae en AYER
    expect(del(despues, hoy) - del(antes, hoy)).toBe(20000); // la de las 00:00 cae en HOY
    expect(despues.hoy.importe - antes.hoy.importe).toBe(20000); // "hoy" tampoco incluye la de ayer
  });
});

describe("gráficos (RF-T2)", () => {
  it("ventas diarias: siempre 30 días seguidos, del más viejo a hoy", async () => {
    const { ventasDiarias } = await obtenerTablero(vendedor);

    expect(ventasDiarias).toHaveLength(30);
    expect(ventasDiarias[29].fecha).toBe(hoyEnArgentina());
    expect(ventasDiarias[0].fecha).toBe(sumarDias(hoyEnArgentina(), -29));
    ventasDiarias.forEach((dia, posicion) => {
      if (posicion > 0) expect(dia.fecha).toBe(sumarDias(ventasDiarias[posicion - 1].fecha, 1));
      expect(dia.importe).toBeGreaterThanOrEqual(0);
    });
  });

  it("por forma de pago: las tres formas, y el total es el del mes", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 10000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const antes = await obtenerTablero(vendedor);

    await confirmarFactura(vendedor, { items: [{ productoId: producto.id, cantidad: 1 }], pago: contado });
    await confirmarFactura(vendedor, {
      items: [{ productoId: producto.id, cantidad: 2 }],
      pago: { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "4242" } },
    });
    await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 3 }],
      pago: { forma: "cuenta_corriente" },
    });
    const despues = await obtenerTablero(vendedor);

    expect(despues.porFormaDePago.map((fila) => fila.forma)).toEqual(["contado", "tarjeta", "cuenta_corriente"]);
    expect(forma(despues, "contado") - forma(antes, "contado")).toBe(10000);
    expect(forma(despues, "tarjeta") - forma(antes, "tarjeta")).toBe(20000);
    expect(forma(despues, "cuenta_corriente") - forma(antes, "cuenta_corriente")).toBe(30000);

    const suma = despues.porFormaDePago.reduce((total, fila) => total + fila.importe, 0);
    expect(suma).toBe(despues.mes.importe);
  });
});

describe("más vendidos, deuda y reposición (RF-T1, RF-T3)", () => {
  it("los 5 más vendidos del mes, ordenados por unidades", async () => {
    // 1.000 unidades: supera a cualquier otra venta de las pruebas, así que queda primero.
    const estrella = await crearProductoDePrueba(admin, { existencia: 1000, precio: 500 });
    await confirmarFactura(vendedor, { items: [{ productoId: estrella.id, cantidad: 1000 }], pago: contado });

    const { masVendidos } = await obtenerTablero(vendedor);

    expect(masVendidos.length).toBeLessThanOrEqual(5);
    expect(masVendidos[0]).toMatchObject({
      productoId: estrella.id,
      codigo: estrella.codigo,
      unidades: 1000,
      importe: 500000,
    });
    masVendidos.forEach((fila, posicion) => {
      if (posicion > 0) expect(fila.unidades).toBeLessThanOrEqual(masVendidos[posicion - 1].unidades);
    });
  });

  it("deuda en cuentas corrientes: sube con una venta a cuenta y baja con un pago", async () => {
    const producto = await crearProductoDePrueba(admin, { existencia: 10, precio: 25000 });
    const cliente = await crearClienteDePrueba(vendedor, { cuentaCorriente: true });
    const antes = await obtenerTablero(vendedor);

    await confirmarFactura(vendedor, {
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 1 }],
      pago: { forma: "cuenta_corriente" },
    });
    const conDeuda = await obtenerTablero(vendedor);
    expect(conDeuda.cuentasCorrientes.totalAdeudado - antes.cuentasCorrientes.totalAdeudado).toBe(25000);
    expect(conDeuda.cuentasCorrientes.clientesConSaldo - antes.cuentasCorrientes.clientesConSaldo).toBe(1);

    await registrarPago(vendedor, cliente.id, { importe: 25000, medio: "efectivo" });
    const pagado = await obtenerTablero(vendedor);
    expect(pagado.cuentasCorrientes).toEqual(antes.cuentasCorrientes);
  });

  it("productos bajo el mínimo: se cuenta el que tiene menos existencia que su mínimo", async () => {
    const antes = await obtenerTablero(vendedor);

    await crearProductoDePrueba(admin, { existencia: 2, stockMinimo: 5 }); // 2 < 5: bajo mínimo
    await crearProductoDePrueba(admin, { existencia: 5, stockMinimo: 5 }); // 5 = 5: no está bajo
    const despues = await obtenerTablero(vendedor);

    expect(despues.bajoMinimo.cantidad - antes.bajoMinimo.cantidad).toBe(1);
  });

  it("lo pueden ver los dos roles", async () => {
    await expect(obtenerTablero(admin)).resolves.toBeDefined();
    await expect(obtenerTablero(vendedor)).resolves.toBeDefined();
  });
});

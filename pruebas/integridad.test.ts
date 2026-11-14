import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/conexion";
import { calcularSaldo } from "@/servicios/clientes";
import { anularFactura, confirmarFactura } from "@/servicios/facturas";
import { registrarPago } from "@/servicios/pagos";
import { registrarMovimientoManual } from "@/servicios/stock";
import {
  crearClienteDePrueba,
  crearProductoDePrueba,
  crearUsuarioDePrueba,
  intentar,
} from "./ayudas";

// Lista de control 10.8, punto 5: la existencia de cada producto coincide con la suma de
// sus movimientos, y el saldo de cada cliente con sus débitos menos sus créditos.
//
// Primero se hace un poco de TODO lo que mueve stock o saldo (ventas de los tres tipos de
// pago, anulaciones, ingresos y egresos manuales, pagos, y varias operaciones que fallan).
// Después se revisa cada producto y cada cliente de la base, sin confiar en lo que devuelve
// el servicio: se recalcula con consultas directas.
const admin = await crearUsuarioDePrueba("admin");
const vendedor = await crearUsuarioDePrueba("vendedor");

describe("la existencia y el saldo siempre coinciden con sus movimientos", () => {
  it("después de una tanda de operaciones mezcladas, de las que algunas fallan", async () => {
    const a = await crearProductoDePrueba(admin, { existencia: 20, precio: 10000 });
    const b = await crearProductoDePrueba(admin, { existencia: 6, precio: 25000 });
    const deudor = await crearClienteDePrueba(vendedor, { cuentaCorriente: true, limiteCredito: 500000 });

    const venta = (cliente: number | null, pago: object, productoId: number, cantidad: number) =>
      confirmarFactura(vendedor, { clienteId: cliente, items: [{ productoId, cantidad }], pago } as never);

    // Ventas que salen bien.
    await venta(null, { forma: "contado" }, a.id, 3);
    await venta(null, { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "1111" } }, b.id, 2);
    const aCuenta = await venta(deudor.id, { forma: "cuenta_corriente" }, a.id, 5);
    await venta(deudor.id, { forma: "cuenta_corriente" }, b.id, 1);

    // Ventas y movimientos que fallan: no tienen que dejar rastro.
    await intentar(() => venta(null, { forma: "contado" }, b.id, 999));
    await intentar(() => venta(deudor.id, { forma: "cuenta_corriente" }, a.id, 15)); // pasa el límite
    await intentar(() => registrarMovimientoManual(admin, b.id, { tipo: "egreso", cantidad: 500, motivo: "Rotura" }));

    // Movimientos manuales y una anulación.
    await registrarMovimientoManual(admin, a.id, { tipo: "ingreso", cantidad: 10, motivo: "Reposición" });
    await registrarMovimientoManual(admin, b.id, { tipo: "egreso", cantidad: 1, motivo: "Rotura" });
    await anularFactura(admin, aCuenta.id, { motivo: "Anulada para la prueba" });

    // Pagos: uno válido y uno mayor a la deuda (falla).
    await registrarPago(vendedor, deudor.id, { importe: 10000, medio: "efectivo" });
    await intentar(() => registrarPago(vendedor, deudor.id, { importe: 99999999, medio: "efectivo" }));

    // 1. Producto por producto: existencia = suma de movimientos, y nunca negativa.
    const productos = await db.all<{ codigo: string; existencia: number; suma: number }>(sql`
      select p.codigo, p.existencia, coalesce(sum(m.cantidad), 0) as suma
      from productos p left join movimientos_stock m on m.producto_id = p.id
      group by p.id`);
    expect(productos.length).toBeGreaterThan(0);
    for (const producto of productos) {
      expect(producto.existencia, `existencia de ${producto.codigo}`).toBe(producto.suma);
      expect(producto.existencia, `${producto.codigo} no puede ser negativo`).toBeGreaterThanOrEqual(0);
    }

    // 2. Y cada movimiento anota la existencia que quedó: recorriéndolos en orden, la suma
    //    acumulada tiene que ser igual a `existencia_resultante` en todos los renglones.
    const movimientos = await db.all<{ producto_id: number; cantidad: number; existencia_resultante: number }>(sql`
      select producto_id, cantidad, existencia_resultante from movimientos_stock order by id`);
    const acumulado = new Map<number, number>();
    for (const movimiento of movimientos) {
      const nuevo = (acumulado.get(movimiento.producto_id) ?? 0) + movimiento.cantidad;
      acumulado.set(movimiento.producto_id, nuevo);
      expect(movimiento.existencia_resultante).toBe(nuevo);
    }

    // 3. Cliente por cliente: el saldo del servicio es igual a débitos − créditos
    //    calculados aparte, con una consulta distinta.
    const clientes = await db.all<{ id: number; debitos: number; creditos: number }>(sql`
      select c.id,
        coalesce(sum(case when m.tipo = 'debito' then m.importe end), 0) as debitos,
        coalesce(sum(case when m.tipo = 'credito' then m.importe end), 0) as creditos
      from clientes c left join movimientos_cuenta m on m.cliente_id = c.id
      group by c.id`);
    expect(clientes.length).toBeGreaterThan(0);
    for (const cliente of clientes) {
      expect(await calcularSaldo(db, cliente.id), `saldo del cliente ${cliente.id}`).toBe(
        cliente.debitos - cliente.creditos,
      );
    }

    // El deudor de la prueba: vendió 5 u. de A a cuenta (anuladas) y 1 u. de B (25.000):
    // quedó debiendo 25.000 y pagó 10.000.
    expect(await calcularSaldo(db, deudor.id)).toBe(25000 - 10000);
  });
});

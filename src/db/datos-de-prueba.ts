// Datos de prueba (secciones 8 y 10.7): 5 categorías, 30 productos, 10 clientes y 50 facturas
// repartidas en los últimos 30 días, con anulaciones, pagos y movimientos manuales de stock.
//
// Todo se crea con los MISMOS SERVICIOS que usa la aplicación (confirmarFactura, registrarPago,
// anularFactura...). Por eso el stock, los saldos y la numeración cumplen todas las reglas, y este
// script además sirve como prueba de los servicios.
//
// La única trampa es la fecha: los servicios graban "ahora". Después de cada operación se le
// pone al registro una fecha pasada para repartir el historial. Como los hechos se ejecutan en
// orden cronológico, los números de factura y de recibo también quedan en orden.
import { and, eq, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api-error";
import { hoyEnArgentina, sumarDias } from "@/lib/formatos";
import type { UsuarioAutenticado } from "@/lib/permisos";
import { crearCategoria } from "@/servicios/categorias";
import { calcularSaldo, crearCliente } from "@/servicios/clientes";
import { anularFactura, confirmarFactura } from "@/servicios/facturas";
import { registrarPago } from "@/servicios/pagos";
import { crearProducto } from "@/servicios/productos";
import { registrarMovimientoManual } from "@/servicios/stock";
import { db } from "./conexion";
import { facturas, movimientosCuenta, movimientosStock, pagos, productos } from "./esquema";

// Los importes de esta lista están en PESOS, para que se lean fácil; se pasan a centavos al cargar.
const CATEGORIAS = ["Herramientas", "Electricidad", "Pinturería", "Plomería", "Jardín"];

// `bajo: true` marca los 4 productos que terminan con menos existencia que su mínimo.
const PRODUCTOS = [
  { codigo: "HE-001", descripcion: "Martillo carpintero 500 g", categoria: 0, precio: 12500, minimo: 5 },
  { codigo: "HE-002", descripcion: "Destornillador Phillips N°2", categoria: 0, precio: 4800, minimo: 10 },
  { codigo: "HE-003", descripcion: 'Pinza universal 8"', categoria: 0, precio: 9900, minimo: 6 },
  { codigo: "HE-004", descripcion: "Cinta métrica 5 m", categoria: 0, precio: 6400, minimo: 8 },
  { codigo: "HE-005", descripcion: 'Llave ajustable 10"', categoria: 0, precio: 15800, minimo: 4, bajo: true },
  { codigo: "HE-006", descripcion: "Juego de mechas acero x13", categoria: 0, precio: 18900, minimo: 5 },
  { codigo: "EL-001", descripcion: "Cinta aisladora 20 m", categoria: 1, precio: 1900, minimo: 30 },
  { codigo: "EL-002", descripcion: "Lámpara LED 12 W", categoria: 1, precio: 3200, minimo: 20 },
  { codigo: "EL-003", descripcion: "Zapatilla 5 tomas con fusible", categoria: 1, precio: 15400, minimo: 8, bajo: true },
  { codigo: "EL-004", descripcion: "Cable unipolar 2,5 mm x metro", categoria: 1, precio: 1150, minimo: 50 },
  { codigo: "EL-005", descripcion: "Tomacorriente doble 10 A", categoria: 1, precio: 4300, minimo: 10 },
  { codigo: "EL-006", descripcion: "Térmica bipolar 20 A", categoria: 1, precio: 11200, minimo: 6 },
  { codigo: "PI-001", descripcion: "Látex interior blanco 4 L", categoria: 2, precio: 28900, minimo: 6, bajo: true },
  { codigo: "PI-002", descripcion: "Esmalte sintético negro 1 L", categoria: 2, precio: 14200, minimo: 6 },
  { codigo: "PI-003", descripcion: "Rodillo de lana 22 cm", categoria: 2, precio: 5200, minimo: 8 },
  { codigo: "PI-004", descripcion: 'Pincel cerda 2"', categoria: 2, precio: 2600, minimo: 10 },
  { codigo: "PI-005", descripcion: "Lija al agua grano 220", categoria: 2, precio: 650, minimo: 40 },
  { codigo: "PI-006", descripcion: "Enduido plástico 4 kg", categoria: 2, precio: 9800, minimo: 6 },
  { codigo: "PL-001", descripcion: 'Llave de paso 1/2"', categoria: 3, precio: 7800, minimo: 8 },
  { codigo: "PL-002", descripcion: "Flexible mallado 40 cm", categoria: 3, precio: 4600, minimo: 10 },
  { codigo: "PL-003", descripcion: "Cinta teflón 10 m", categoria: 3, precio: 700, minimo: 40 },
  { codigo: "PL-004", descripcion: "Sellador de silicona transparente", categoria: 3, precio: 5900, minimo: 10 },
  { codigo: "PL-005", descripcion: "Codo PVC 110 mm", categoria: 3, precio: 1800, minimo: 15 },
  { codigo: "PL-006", descripcion: "Sifón de PVC doble", categoria: 3, precio: 6700, minimo: 6 },
  { codigo: "JA-001", descripcion: "Manguera reforzada 15 m", categoria: 4, precio: 21500, minimo: 3 },
  { codigo: "JA-002", descripcion: "Tijera de podar", categoria: 4, precio: 13600, minimo: 3, bajo: true },
  { codigo: "JA-003", descripcion: "Regador plástico 10 L", categoria: 4, precio: 8900, minimo: 5 },
  { codigo: "JA-004", descripcion: "Pala ancha con cabo", categoria: 4, precio: 11800, minimo: 4 },
  { codigo: "JA-005", descripcion: "Rastrillo metálico 14 dientes", categoria: 4, precio: 9400, minimo: 4 },
  { codigo: "JA-006", descripcion: "Tierra para macetas 20 L", categoria: 4, precio: 4200, minimo: 10 },
];

// `limite` en pesos; null = sin límite. Los 6 primeros tienen cuenta corriente.
const CLIENTES = [
  { tipoDoc: "DNI", nroDoc: "28456123", nombre: "Mariana López", cuenta: true, limite: 400000, domicilio: "Las Heras 455", telefono: "381 455-2210", email: "mariana.lopez@correo.test" },
  { tipoDoc: "CUIT", nroDoc: "30709988774", nombre: "Consorcio Edificio Plaza", cuenta: true, limite: null, domicilio: "Av. Mitre 880", telefono: "381 430-1200", email: null },
  { tipoDoc: "CUIT", nroDoc: "30712345671", nombre: "Construcciones Norte SRL", cuenta: true, limite: 1500000, domicilio: "Ruta 9 km 1310", telefono: "381 430-7788", email: "compras@norte.test" },
  { tipoDoc: "DNI", nroDoc: "31222908", nombre: "Jorge Paz", cuenta: true, limite: 300000, domicilio: "Crisóstomo Álvarez 77", telefono: "381 512-9034", email: null },
  { tipoDoc: "DNI", nroDoc: "27890456", nombre: "Silvia Herrera", cuenta: true, limite: 250000, domicilio: "Laprida 1020", telefono: "381 467-3300", email: null },
  { tipoDoc: "CUIT", nroDoc: "20254441113", nombre: "Taller El Tornillo", cuenta: true, limite: null, domicilio: "Av. Belgrano 2450", telefono: "381 421-5566", email: "eltornillo@correo.test" },
  { tipoDoc: "DNI", nroDoc: "38900123", nombre: "Carla Medina", cuenta: false, limite: null, domicilio: null, telefono: null, email: null },
  { tipoDoc: "DNI", nroDoc: "35678210", nombre: "Lucía Fernández", cuenta: false, limite: null, domicilio: null, telefono: "381 600-1122", email: null },
  { tipoDoc: "DNI", nroDoc: "33445566", nombre: "Martín Acosta", cuenta: false, limite: null, domicilio: null, telefono: "381 590-7781", email: null },
  { tipoDoc: "DNI", nroDoc: "40112334", nombre: "Ramiro Díaz", cuenta: false, limite: null, domicilio: null, telefono: "381 588-4401", email: null },
];

const MOTIVOS_DE_ANULACION = ["Error en la carga de cantidades", "El cliente se arrepintió", "Producto equivocado"];

// ---------------------------------------------------------------------------------------------
// Números al azar con semilla fija: así los datos de prueba son SIEMPRE los mismos y se puede
// repetir una demo. (Es el generador "mulberry32"; no hace falta entenderlo por dentro.)
function crearAzar(semilla: number) {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAzar(2026);
const entre = (minimo: number, maximo: number) => minimo + Math.floor(azar() * (maximo - minimo + 1));
const elegir = <T>(lista: T[]): T => lista[entre(0, lista.length - 1)];

const formatoIso = (milisegundos: number) => new Date(milisegundos).toISOString().replace(/\.\d{3}Z$/, "Z");

// Un momento pasado: "hace N días a las HH:MM" en hora de Argentina (UTC-3), como texto ISO en UTC.
// Nunca devuelve una fecha futura.
function momento(diasAtras: number, hora: number, minuto: number): string {
  const dia = sumarDias(hoyEnArgentina(), -diasAtras);
  const utc = `${dia}T${String(hora + 3).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00Z`;
  const ahora = formatoIso(Date.now());
  return utc > ahora ? ahora : utc;
}

// El mismo momento, unas horas o días después (sin pasar de ahora).
function despues(cuando: string, horas: number): string {
  const nuevo = formatoIso(Date.parse(cuando) + horas * 3_600_000);
  const ahora = formatoIso(Date.now());
  return nuevo > ahora ? ahora : nuevo;
}

// ---------------------------------------------------------------------------------------------
// El PLAN: primero se decide todo lo que va a pasar (sin tocar la base) y recién después se hace.
// Así se puede calcular cuánto stock inicial necesita cada producto.
type Venta = {
  cuando: string;
  cliente: number | null; // posición en CLIENTES; null = consumidor final
  vendedor: "admin" | "vendedor";
  forma: "contado" | "tarjeta" | "cuenta_corriente";
  items: { codigo: string; cantidad: number }[];
  anular: boolean;
};

type Evento =
  | { tipo: "venta"; cuando: string; venta: Venta }
  | { tipo: "anulacion"; cuando: string; venta: Venta }
  | { tipo: "pago"; cuando: string; cliente: number }
  | { tipo: "ajuste"; cuando: string; codigo: string; movimiento: "ingreso" | "egreso"; cantidad: number; motivo: string };

function planificarVentas(): Venta[] {
  const conCuenta = CLIENTES.flatMap((cliente, posicion) => (cliente.cuenta ? [posicion] : []));
  const sinCuenta = CLIENTES.flatMap((cliente, posicion) => (cliente.cuenta ? [] : [posicion]));
  const codigosBajos = new Set(PRODUCTOS.filter((producto) => producto.bajo).map((producto) => producto.codigo));

  const ventas: Venta[] = Array.from({ length: 50 }, (_, numero) => {
    // Las 3 primeras son de hoy (el tablero siempre muestra "ventas de hoy"); el resto, en los 29 días anteriores.
    const diasAtras = numero < 3 ? 0 : entre(1, 29);
    const sorteo = azar();
    const forma = sorteo < 0.5 ? "contado" : sorteo < 0.78 ? "tarjeta" : "cuenta_corriente";
    const cliente =
      forma === "cuenta_corriente"
        ? elegir(conCuenta)
        : azar() < 0.2
          ? elegir(forma === "contado" ? sinCuenta : [...sinCuenta, ...conCuenta])
          : null;

    // Entre 1 y 3 productos distintos.
    const elegidos = new Set<string>();
    const cantidadDeRenglones = entre(1, 3);
    while (elegidos.size < cantidadDeRenglones) elegidos.add(elegir(PRODUCTOS).codigo);
    const items = [...elegidos].map((codigo) => {
      const barato = PRODUCTOS.find((producto) => producto.codigo === codigo)!.precio < 2000;
      return { codigo, cantidad: barato ? entre(2, 10) : entre(1, 3) };
    });

    return {
      cuando: momento(diasAtras, entre(8, 20), entre(0, 59)),
      cliente,
      vendedor: azar() < 0.7 ? "vendedor" : "admin",
      forma,
      items,
      anular: false,
    } satisfies Venta;
  });

  // Se anulan 3 facturas: una a cuenta corriente y dos más. Ninguna con los productos "bajo
  // mínimo", porque la anulación devuelve stock y los dejaría por encima del mínimo.
  const candidatas = ventas.filter((venta) => !venta.items.some((item) => codigosBajos.has(item.codigo)));
  const aCuenta = candidatas.find((venta) => venta.forma === "cuenta_corriente");
  if (aCuenta) aCuenta.anular = true;
  const otras = candidatas.filter((venta) => !venta.anular);
  for (const venta of [otras[2], otras[11], otras[20]]) if (venta) venta.anular = true;

  return ventas;
}

function planificarEventos(ventas: Venta[]): Evento[] {
  const eventos: Evento[] = ventas.map((venta) => ({ tipo: "venta", cuando: venta.cuando, venta }));

  for (const venta of ventas.filter((v) => v.anular)) {
    eventos.push({ tipo: "anulacion", cuando: despues(venta.cuando, entre(1, 3)), venta });
  }

  // Cada cliente con cuenta corriente paga una o dos veces, algunos días después de su primera compra a cuenta.
  CLIENTES.forEach((cliente, posicion) => {
    const compras = ventas.filter((venta) => venta.cliente === posicion && venta.forma === "cuenta_corriente");
    if (!cliente.cuenta || compras.length === 0) return;
    const primera = compras.map((venta) => venta.cuando).sort()[0];
    for (let pago = 0; pago < entre(1, 2); pago++) {
      eventos.push({ tipo: "pago", cuando: despues(primera, entre(1, 6) * 24 + entre(0, 8)), cliente: posicion });
    }
  });

  // Dos movimientos manuales de stock: una reposición y una rotura.
  eventos.push({ tipo: "ajuste", cuando: momento(12, 9, 30), codigo: "EL-001", movimiento: "ingreso", cantidad: 20, motivo: "Reposición" });
  eventos.push({ tipo: "ajuste", cuando: momento(8, 16, 45), codigo: "JA-006", movimiento: "egreso", cantidad: 1, motivo: "Rotura" });

  return eventos.sort((a, b) => a.cuando.localeCompare(b.cuando));
}

// ---------------------------------------------------------------------------------------------
export async function cargarDatosDePrueba(admin: UsuarioAutenticado, vendedor: UsuarioAutenticado) {
  const [{ cantidad }] = await db.select({ cantidad: sql<number>`count(*)` }).from(productos);
  if (cantidad > 0) {
    console.log("Ya hay productos cargados: no se agregan datos de prueba.");
    return;
  }

  const ventas = planificarVentas();
  const eventos = planificarEventos(ventas);

  // Stock inicial: lo que se va a vender, más lo que tiene que quedar al final. Los 4
  // productos "bajo mínimo" terminan con menos que su mínimo; el resto, con holgura.
  const demanda = new Map<string, number>();
  for (const venta of ventas) {
    for (const item of venta.items) demanda.set(item.codigo, (demanda.get(item.codigo) ?? 0) + item.cantidad);
  }

  // Categorías y productos (con su stock inicial como ingreso, regla 2).
  const idCategoria = [];
  for (const nombre of CATEGORIAS) idCategoria.push((await crearCategoria(admin, { nombre })).id);

  const idProducto = new Map<string, number>();
  for (const producto of PRODUCTOS) {
    const sobrante = producto.bajo ? Math.max(0, producto.minimo - 2) : producto.minimo + 5 + entre(0, 30);
    const creado = await crearProducto(admin, {
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      categoriaId: idCategoria[producto.categoria],
      precio: producto.precio * 100,
      stockMinimo: producto.minimo,
      stockInicial: (demanda.get(producto.codigo) ?? 0) + sobrante,
    });
    idProducto.set(producto.codigo, creado.id);
  }
  // El stock inicial se cargó "hoy"; se lo manda a antes de la primera venta.
  await db.update(movimientosStock).set({ fecha: momento(31, 8, 0) });

  const idCliente: number[] = [];
  for (const cliente of CLIENTES) {
    const creado = await crearCliente(admin, {
      tipoDoc: cliente.tipoDoc,
      nroDoc: cliente.nroDoc,
      nombre: cliente.nombre,
      domicilio: cliente.domicilio,
      telefono: cliente.telefono,
      email: cliente.email,
      cuentaCorriente: cliente.cuenta,
      limiteCredito: cliente.limite === null ? null : cliente.limite * 100,
    });
    idCliente.push(creado.id);
  }

  // Se hace todo en orden cronológico.
  const idFactura = new Map<Venta, number>();
  let omitidos = 0;

  for (const evento of eventos) {
    if (evento.tipo === "venta") {
      const { venta } = evento;
      const usuario = venta.vendedor === "admin" ? admin : vendedor;
      const clienteId = venta.cliente === null ? null : idCliente[venta.cliente];
      const items = venta.items.map((item) => ({ productoId: idProducto.get(item.codigo)!, cantidad: item.cantidad }));
      const total = venta.items.reduce(
        (suma, item) => suma + PRODUCTOS.find((p) => p.codigo === item.codigo)!.precio * 100 * item.cantidad,
        0,
      );

      const pagoEn = (forma: Venta["forma"]) =>
        forma === "contado"
          ? // A veces se paga justo y a veces con un billete más grande (hasta el próximo múltiplo de $ 1.000).
            { forma, montoRecibido: azar() < 0.5 ? total : Math.ceil(total / 100000) * 100000 }
          : forma === "tarjeta"
            ? {
                forma,
                tarjeta: {
                  tipo: elegir(["debito", "credito"]),
                  marca: elegir(["Visa", "Mastercard", "Naranja"]),
                  ultimos4: String(entre(1000, 9999)),
                },
              }
            : { forma };

      let factura;
      try {
        factura = await confirmarFactura(usuario, { clienteId, items, pago: pagoEn(venta.forma) });
      } catch (error) {
        // Si una venta a cuenta pasara el límite del cliente, se cobra de contado: así siguen siendo 50 facturas.
        if (!(error instanceof ApiError) || error.code !== "LIMITE_CREDITO_EXCEDIDO") throw error;
        venta.forma = "contado";
        factura = await confirmarFactura(usuario, { clienteId, items, pago: pagoEn("contado") });
      }

      idFactura.set(venta, factura.id);
      await db.update(facturas).set({ fecha: venta.cuando }).where(eq(facturas.id, factura.id));
      await db.update(movimientosStock).set({ fecha: venta.cuando }).where(eq(movimientosStock.facturaId, factura.id));
      await db.update(movimientosCuenta).set({ fecha: venta.cuando }).where(eq(movimientosCuenta.facturaId, factura.id));
    }

    if (evento.tipo === "anulacion") {
      const id = idFactura.get(evento.venta)!;
      await anularFactura(admin, id, { motivo: elegir(MOTIVOS_DE_ANULACION) });
      await db.update(facturas).set({ anuladaEn: evento.cuando }).where(eq(facturas.id, id));
      await db
        .update(movimientosStock)
        .set({ fecha: evento.cuando })
        .where(and(eq(movimientosStock.facturaId, id), eq(movimientosStock.tipo, "anulacion")));
      await db
        .update(movimientosCuenta)
        .set({ fecha: evento.cuando })
        .where(and(eq(movimientosCuenta.facturaId, id), eq(movimientosCuenta.tipo, "credito")));
    }

    if (evento.tipo === "pago") {
      // Paga entre el 30 % y el 70 % de lo que debe en ese momento (nunca más: regla 8).
      const clienteId = idCliente[evento.cliente];
      const saldo = await calcularSaldo(db, clienteId);
      if (saldo <= 0) {
        omitidos++;
        continue;
      }
      const importe = Math.min(saldo, Math.max(100000, Math.round((saldo * entre(30, 70)) / 100 / 10000) * 10000));
      const usuario = azar() < 0.5 ? admin : vendedor;
      const recibo = await registrarPago(usuario, clienteId, {
        importe,
        medio: elegir(["efectivo", "transferencia", "tarjeta_debito"]),
        observacion: "Pago a cuenta",
      });
      await db.update(pagos).set({ fecha: evento.cuando }).where(eq(pagos.id, recibo.id));
      await db.update(movimientosCuenta).set({ fecha: evento.cuando }).where(eq(movimientosCuenta.pagoId, recibo.id));
    }

    if (evento.tipo === "ajuste") {
      const movimiento = await registrarMovimientoManual(admin, idProducto.get(evento.codigo)!, {
        tipo: evento.movimiento,
        cantidad: evento.cantidad,
        motivo: evento.motivo,
      });
      await db.update(movimientosStock).set({ fecha: evento.cuando }).where(eq(movimientosStock.id, movimiento.id));
    }
  }

  const [resumen] = await db.all<{ emitidas: number; anuladas: number; recibos: number }>(sql`
    select
      (select count(*) from facturas where estado = 'emitida') as emitidas,
      (select count(*) from facturas where estado = 'anulada') as anuladas,
      (select count(*) from pagos) as recibos`);
  console.log(
    `Datos de prueba cargados: ${CATEGORIAS.length} categorías, ${PRODUCTOS.length} productos, ${CLIENTES.length} clientes, ` +
      `${resumen.emitidas + resumen.anuladas} facturas (${resumen.anuladas} anuladas) y ${resumen.recibos} recibos` +
      (omitidos > 0 ? ` (${omitidos} pagos omitidos por no haber deuda)` : "") +
      ".",
  );
}

# Estructura del proyecto

> Estado: **ACORDADA** en la etapa 1. Las decisiones tomadas están en la sección 6.

## 1. Árbol de carpetas

```text
/
├── drizzle.config.ts          ← configuración de drizzle-kit (esquema y carpeta de migraciones)
├── migraciones/               ← SQL generado por drizzle-kit (no se edita a mano)
├── .env.example
└── src/
    ├── proxy.ts               ← barrera 1: sin cookie firmada → redirige a /login
    │
    ├── db/                    ← CAPA ACCESO A DATOS
    │   ├── esquema.ts         ← las 9 tablas de la sección 7
    │   ├── conexion.ts        ← decide SQLite local (file:local.db) o Turso
    │   └── seed.ts            ← datos iniciales (usa los servicios, sección 10.7)
    │
    ├── esquemas/              ← ESQUEMAS ZOD (compartidos formulario ↔ servidor)
    │   ├── comunes.ts  valores.ts   ← id y paginación; listas de valores permitidos
    │   ├── auth.ts  usuarios.ts  categorias.ts  productos.ts  stock.ts
    │   └── clientes.ts  pagos.ts  facturas.ts
    │
    ├── servicios/             ← CAPA SERVICIOS (las reglas de negocio viven SOLO acá)
    │   ├── auth.ts  usuarios.ts  categorias.ts  productos.ts
    │   ├── stock.ts           ← moverStock()
    │   ├── clientes.ts  pagos.ts
    │   ├── facturas.ts        ← confirmarFactura() y anularFactura()
    │   └── tablero.ts
    │
    ├── lib/                   ← piezas comunes chicas
    │   ├── api-error.ts       ← clase ApiError + códigos de la sección 11.8
    │   ├── ruta.ts            ← envoltorio de Route Handlers (sección 10.3)
    │   ├── accion.ts          ← envoltorio de Server Actions (sección 10.3)
    │   ├── cookie-sesion.ts   ← firmar y verificar la cookie (sin base: también la usa el proxy)
    │   ├── sesion.ts          ← abrir/cerrar la cookie y buscar el usuario en la base
    │   ├── permisos.ts        ← tipo UsuarioAutenticado y exigirAdmin()
    │   ├── formatos.ts        ← moneda, fecha, hora AR, documento, numeración
    │   └── comercio.ts        ← datos fijos del comercio para comprobante y recibo
    │
    ├── acciones/              ← CAPA ADAPTADORES: Server Actions, una por módulo
    │   └── usuarios.ts  categorias.ts  productos.ts  clientes.ts ...
    │
    ├── app/
    │   ├── layout.tsx         ← layout raíz (html, fuentes, avisos)
    │   ├── login/page.tsx     ← única página pública, fuera del layout del sistema
    │   ├── (sistema)/         ← grupo de rutas con panel lateral + barra superior
    │   │   ├── layout.tsx     ← barrera 2: busca el usuario; si no hay, /login
    │   │   ├── page.tsx       ← tablero (/)
    │   │   ├── ventas/        ← page.tsx, nueva/page.tsx, [id]/page.tsx
    │   │   ├── productos/     ← page.tsx, [id]/page.tsx, categorias/page.tsx
    │   │   ├── clientes/      ← page.tsx, [id]/page.tsx, saldos/page.tsx
    │   │   ├── usuarios/page.tsx
    │   │   └── perfil/page.tsx
    │   └── api/               ← CAPA ADAPTADORES: las 31 rutas, igual que la sección 11.9
    │
    ├── components/            ← CAPA INTERFAZ
    │   ├── ui/                ← componentes de shadcn/ui (los genera shadcn)
    │   ├── maquetacion.tsx    ← Pila, Fila, Texto, Titulo (Grilla cuando haga falta)
    │   ├── comunes/           ← encabezado de página, estados carga/vacío/error,
    │   │                         confirmar acción, campo, campo de importe,
    │   │                         insignia de estado, paginador
    │   └── ventas/ productos/ clientes/ usuarios/ tablero/   ← componentes del dominio
    │
    └── hooks/
        └── use-formulario.ts  ← errores por campo y estado de envío (sección 10.6).
                                 Lleva el prefijo "use" porque React lo exige para los hooks.
```

## 2. Las cuatro capas (sección 10.1)

| Capa | Carpeta | Regla |
| --- | --- | --- |
| Acceso a datos | `src/db/` | Tablas, migraciones y conexión. Sin reglas. |
| Servicios | `src/servicios/` | Valida con Zod → verifica rol → aplica reglas → devuelve. No conoce HTTP ni cookies. |
| Adaptadores | `src/app/api/**/route.ts` y `src/acciones/` | Piden la sesión, leen el pedido, llaman al servicio y responden. No deciden nada. |
| Interfaz | `src/app/(sistema)/**/page.tsx`, `src/components/`, `src/hooks/` | Muestra, adelanta validaciones con el mismo esquema Zod y avisa. |

## 3. Recorrido de un módulo (igual para todos)

Ejemplo con productos. Para cualquier otro módulo se cambia la palabra `productos`:

1. `src/esquemas/productos.ts`: qué datos se aceptan (lo usan el formulario y el servicio).
2. `src/servicios/productos.ts`: las reglas (por ejemplo, el código único).
3. `src/app/api/productos/route.ts`: la API REST, unas pocas líneas.
   `src/acciones/productos.ts`: la Server Action para los formularios, que llama al mismo servicio.
4. `src/app/(sistema)/productos/page.tsx` + `src/components/productos/`: la pantalla.

## 4. Dónde vive cada pieza clave

| Pieza | Archivo | Nota |
| --- | --- | --- |
| `moverStock()` | `src/servicios/stock.ts` | Recibe la transacción abierta (`tx`), hace el `UPDATE ... WHERE existencia >= ?` y graba el movimiento. Es interna: la llaman `confirmarFactura`, `anularFactura`, el alta de producto con stock inicial y el ingreso/egreso manual. |
| Confirmación de factura | `src/servicios/facturas.ts` → `confirmarFactura()` | Los 9 pasos de la sección 11.6 en una sola transacción. |
| Anulación | `src/servicios/facturas.ts` → `anularFactura()` | Lo inverso, solo admin y con motivo. |
| `ApiError` | `src/lib/api-error.ts` | Única clase de error, con los códigos de la sección 11.8. |
| Envoltorio de rutas | `src/lib/ruta.ts` | Pide sesión, lee params y JSON, y convierte errores al formato 11.1. |
| Envoltorio de Server Actions | `src/lib/accion.ts` | Igual, pero devuelve `{ ok, data }` o `{ ok: false, error }`. |
| Formatos | `src/lib/formatos.ts` | `$ 12.345,50`, `dd/mm/aaaa`, hora de Argentina, documento, `0001-00000001`. También pasa un día `AAAA-MM-DD` de Argentina a rango UTC para los filtros. |
| Saldo del cliente | `src/servicios/clientes.ts` | Siempre calculado: suma de débitos − créditos de `movimientos_cuenta`. No hay columna `saldo`. |
| Sesión | `src/lib/cookie-sesion.ts` y `src/lib/sesion.ts` | Cookie `httpOnly` firmada con HMAC (`node:crypto`); `usuarioActual()` busca el usuario en la base en cada pedido. |

## 5. Las tres barreras de seguridad (sección 10.5)

1. `src/proxy.ts`: sin cookie válida, redirige a `/login` (o `401` en `/api`).
2. `src/app/(sistema)/layout.tsx`: busca el usuario en la base; si está inactivo, vuelve a `/login`.
3. Cada función de `src/servicios/`: verifica el rol y responde `403 SIN_PERMISO`.

## 6. Decisiones sobre dudas de la especificación

1. **Medio de pago de un recibo.** RF-C5 dice «efectivo, transferencia o tarjeta», pero la API (11.5)
   dice `tarjeta_debito`. **Decisión:** `efectivo`, `transferencia` o `tarjeta_debito`, como la API.
2. **Server Actions.** **Decisión:** se sigue la sección 10.6. Los formularios mutan con Server
   Actions (`src/acciones/`) y la confirmación de la venta y la búsqueda en vivo usan la API REST.
   Las dos llaman a los mismos servicios.
3. **Librerías fuera del stack.** **Autorizadas:** `bcryptjs` (bcrypt en JS puro, sin compilación
   nativa), `tsx` (para correr el seed en TypeScript, solo en desarrollo) y `vitest` (pruebas de la
   etapa 8, solo en desarrollo).
4. **Datos del comercio** para el comprobante (RF-V7) y el recibo (RF-C5). **Decisión:** van como
   constante en `src/lib/comercio.ts`.

Otras aclaraciones, sin contradicción:
- **Existencia guardada, saldo calculado.** La sección 7 permite las dos opciones. La existencia
  queda como columna, porque `moverStock()` necesita el `UPDATE ... WHERE existencia >= ?`. El
  saldo se calcula siempre desde `movimientos_cuenta` (sección 10.2).
- **El vendedor puede dar de baja clientes.** La API (11.2) marca `PATCH /api/clientes/{id}` para
  ambos roles, y eso incluye `activo: false`.
- **Proxy.** El «proxy de Next.js» de la sección 10.5 es el archivo `proxy.ts` de Next 16, que
  reemplaza al viejo `middleware.ts`.

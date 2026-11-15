# Sistema de gestión comercial

Segundo parcial de **Programación IV** (TUP). Sistema para un comercio minorista de un solo local:
factura ventas, controla las existencias del catálogo y lleva la cuenta corriente de los clientes.
El comercio de ejemplo es una ferretería.

- **URL pública:** https://tup-4-parcial.vercel.app
- **Repositorio:** https://github.com/lorenz890/TUP-4-Parcial-

## Integrantes (grupo 6)

- Lorenzo Gaiser
- Tomás Gómez Asat
- Ulices Acosta

## Qué hace

- **Ventas:** nueva venta en una sola pantalla, operable con teclado (F2 producto, F4 cliente, F8 pago, F9 confirmar);
  contado, tarjeta y cuenta corriente; comprobante imprimible; listado con filtros; anulación (solo administrador).
- **Productos y existencias:** catálogo con categorías, ingresos y egresos manuales de stock, historial de movimientos
  y marca de los productos bajo el mínimo.
- **Clientes y cuenta corriente:** alta y baja lógica, saldo calculado desde los movimientos, pagos con recibo
  numerado e imprimible, y listado de saldos.
- **Usuarios y permisos:** dos roles (administrador y vendedor), sesión con cookie firmada, permisos verificados en el servidor.
- **Tablero de inicio:** indicadores del día y del mes, ventas de los últimos 30 días, ventas por forma de pago y los más vendidos.

Fuera del alcance (según el enunciado): factura electrónica fiscal, discriminación de IVA, cobro real con tarjeta, compras a proveedores.

## Tecnologías

TypeScript · Next.js (App Router, Route Handlers) · Tailwind CSS · shadcn/ui · Chart.js con react-chartjs-2 ·
Drizzle ORM con migraciones de drizzle-kit · SQLite en desarrollo y Turso (libSQL) en producción · Zod · pnpm ·
despliegue en Vercel. La sesión es propia (cookie firmada con HMAC), sin Auth.js, y las contraseñas usan bcrypt.

Se agregaron, además del stack del enunciado: `bcryptjs` (hash de contraseñas), `tsx` (correr el seed en TypeScript)
y `vitest` (pruebas automáticas).

## Instalación local

Requiere **Node 22 o superior** y **pnpm** (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

La app queda en http://localhost:3000. Sin variables de Turso usa el archivo SQLite local `local.db`. El `.env.example`
ya trae valores que funcionan para desarrollo. `pnpm run db:seed` crea los dos usuarios de prueba y carga los datos de prueba.

## Variables de entorno

Los nombres están en [`.env.example`](.env.example). El archivo `.env` real nunca se sube a Git.

| Variable | Para qué sirve |
| --- | --- |
| `TURSO_DATABASE_URL` | URL de la base en Turso. Si falta (o falta el token), se usa `local.db`. |
| `TURSO_AUTH_TOKEN` | Token de acceso a la base de Turso. Es secreto. |
| `SESSION_SECRET` | Clave que firma la cookie de sesión (mínimo 32 caracteres). Es secreta. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE` | Primer administrador que crea `db:seed` (RF-U3). |
| `VENDEDOR_EMAIL`, `VENDEDOR_PASSWORD`, `VENDEDOR_NOMBRE` | Vendedor de prueba que crea `db:seed`. |

## Usuarios de prueba

| Rol | Email | Contraseña | Qué puede hacer |
| --- | --- | --- | --- |
| Administrador | `admin@comercio.test` | `admin12345` | Todo: usuarios, productos, stock, anulaciones. |
| Vendedor | `pablo@comercio.test` | `vendedor12345` | Vender, consultar catálogo, clientes y pagos. No anula, no toca stock ni usuarios. |

Son los valores del `.env.example` (solo para desarrollo y demostración).

## Datos de prueba

`pnpm run db:seed` carga, usando los mismos servicios que usa la aplicación (por eso el stock, los saldos y la
numeración cumplen todas las reglas): **2 usuarios** (uno por rol), **5 categorías**, **30 productos** (4 de ellos
bajo el stock mínimo), **10 clientes** (6 con cuenta corriente), **50 facturas** repartidas en los últimos 30 días
(contado, tarjeta y cuenta corriente, 4 anuladas), pagos con recibo y dos movimientos manuales de stock. Los datos son
siempre los mismos (semilla fija) y el script se puede correr de nuevo sin duplicar nada.

## Reglas de negocio y dónde viven

Las reglas de la sección 6 del enunciado están en la capa de servicios (`src/servicios/`); las rutas y las pantallas
solo llaman a los servicios.

| Regla | Dónde |
| --- | --- |
| 1 y 2. Existencia nunca negativa; todo cambio de stock deja un movimiento | `moverStock()` en `servicios/stock.ts` (único lugar que cambia la existencia) |
| 3. El precio se congela | `confirmarFactura()` en `servicios/facturas.ts` (copia descripción y precio) |
| 4. Numeración correlativa y sin huecos | `confirmarFactura()` (facturas) y `registrarPago()` (recibos) |
| 5. Una factura confirmada no se modifica | No hay servicio de edición: solo `anularFactura()` |
| 6, 7 y 8. Cuenta corriente, saldo y pagos | `calcularSaldo()` en `servicios/clientes.ts`; `registrarPago()` en `servicios/pagos.ts` |
| 9. Tarjeta: solo tipo, marca y últimos 4 | `esquemas/facturas.ts` (`.strict()` rechaza el número completo) |
| 10. Importes en centavos | Todo el sistema; `lib/formatos.ts` los muestra como `$ 12.345,50` |
| 11. Trazabilidad | Usuario y fecha en facturas, movimientos y pagos |
| 12. Bajas lógicas | Productos, clientes y usuarios se desactivan, nunca se borran |

## Requerimientos funcionales

| Módulo | Códigos | Dónde |
| --- | --- | --- |
| Ventas | RF-V1 a RF-V9 | `servicios/facturas.ts`, `components/ventas/`, `app/(sistema)/ventas/` |
| Productos y existencias | RF-P1 a RF-P7 | `servicios/productos.ts`, `stock.ts`, `categorias.ts`, `app/(sistema)/productos/` |
| Clientes y cuenta corriente | RF-C1 a RF-C7 | `servicios/clientes.ts`, `pagos.ts`, `app/(sistema)/clientes/` |
| Usuarios y acceso | RF-U1 a RF-U5 | `servicios/auth.ts`, `usuarios.ts`, `lib/sesion.ts`, `proxy.ts` |
| Tablero | RF-T1 a RF-T3 | `servicios/tablero.ts`, `app/(sistema)/page.tsx`, `components/tablero/` |

## Arquitectura

Cuatro capas (sección 10 del enunciado): acceso a datos (`src/db/`), servicios (`src/servicios/`), adaptadores
(`src/app/api/**/route.ts` y `src/acciones/`) e interfaz (`src/components/` y las páginas). Cada módulo sigue el mismo
recorrido: **esquema de Zod → servicio → ruta → pantalla**. Los esquemas de Zod (`src/esquemas/`) los comparten los
formularios y el servidor.

La documentación del proyecto está en [`docs/`](docs/):
[`ESTRUCTURA.md`](docs/ESTRUCTURA.md) (carpetas y capas) y [`ESTUDIO.md`](docs/ESTUDIO.md) (guía de estudio para la
defensa, una sección por etapa).

## Pruebas automáticas

```bash
pnpm test
```

Para revisar los tipos de TypeScript (también en un clon nuevo, porque primero genera los tipos de rutas de Next):

```bash
pnpm run typecheck
```

Corren con vitest sobre una base SQLite **temporal** (en la carpeta temporal del sistema, con el mismo esquema y las
mismas migraciones que la aplicación). Nunca tocan `local.db` ni Turso: la configuración vacía las variables de Turso y
`pruebas/seguridad.ts` corta si la base no es la temporal. Cubren la lista de control de la sección 10.8: venta sin stock
sin datos parciales, dos ventas simultáneas de la última unidad, un vendedor contra las operaciones de administrador, y
existencia y saldo que coinciden con sus movimientos. También prueban el tablero.

## Publicación en Vercel + Turso

La app corre en Vercel y la base en Turso. Los comandos son de PowerShell (Windows). El CLI de Turso en Windows necesita
WSL, por eso la base se crea desde el panel web.

### 1. Crear la base en Turso

1. En https://app.turso.tech crear una base llamada `gestion-comercial`, en la región `AWS us-east-1` (la misma que usa
   Vercel por defecto).
2. Copiar la **URL** de la base (`libsql://gestion-comercial-<usuario>.aws-us-east-1.turso.io`).
3. Generar un **token** con permisos de lectura y escritura, sin vencimiento. El token es secreto: no se escribe en el
   código, en el chat ni en Git.

### 2. Crear las tablas y cargar los datos en Turso

En una terminal, dentro de la carpeta del proyecto. Las variables viven solo en esa ventana de terminal:

```bash
$env:TURSO_DATABASE_URL = "libsql://gestion-comercial-<usuario>.aws-us-east-1.turso.io"; $env:TURSO_AUTH_TOKEN = Get-Clipboard
pnpm run db:migrate
pnpm run db:seed
```

- `Get-Clipboard` toma el token del portapapeles, así no queda escrito en la terminal.
- El seed lee el `.env` local para los usuarios (`ADMIN_*` y `VENDEDOR_*`). Si en Turso ya existe un administrador con ese
  email, no lo vuelve a crear; si ya hay productos, no agrega datos de prueba.
- Para usar otro administrador en producción, definir antes `ADMIN_EMAIL` y `ADMIN_PASSWORD` con valores propios.

### 3. Importar el repositorio en Vercel

1. En https://vercel.com (plan Hobby) elegir **Add New → Project** e importar el repositorio de GitHub. Vercel detecta
   Next.js solo.
2. No agregar la integración de Turso que ofrece Vercel: crearía otra base.
3. En **Settings → Environment Variables** cargar, para todos los entornos:
   - `TURSO_DATABASE_URL` (la URL de la base).
   - `TURSO_AUTH_TOKEN` (el token), marcada como *Sensitive*.
   - `SESSION_SECRET`, una clave nueva y distinta de la de desarrollo, también *Sensitive*. Se genera con:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Las variables `ADMIN_*` y `VENDEDOR_*` **no** van en Vercel: los usuarios se crean con el seed del paso 2.

### 4. Publicar

Vercel despliega solo cada vez que se sube código a la rama `main`. Si se cambia una variable de entorno, hay que volver
a desplegar (**Deployments → Redeploy**) para que tome el valor nuevo.

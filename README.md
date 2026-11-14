# Sistema de gestión comercial

2º parcial de Programación IV. Factura ventas, controla el stock y lleva la cuenta
corriente de los clientes de un comercio minorista.

> Este README se completa en la etapa 11 (integrantes, URL pública, usuarios de
> prueba). Por ahora tiene la puesta en marcha y la publicación.

## Puesta en marcha local

Requiere Node 22 o superior y pnpm (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

La app queda en http://localhost:3000. Sin variables de Turso usa el archivo
SQLite local `local.db`. El usuario inicial sale de `ADMIN_EMAIL` y
`ADMIN_PASSWORD` del `.env`.

## Variables de entorno

Los nombres están en `.env.example`. El archivo `.env` real nunca se sube a Git.

| Variable | Para qué sirve |
| --- | --- |
| `TURSO_DATABASE_URL` | URL de la base en Turso. Si falta (o falta el token), se usa `local.db`. |
| `TURSO_AUTH_TOKEN` | Token de acceso a la base de Turso. Es secreto. |
| `SESSION_SECRET` | Clave que firma la cookie de sesión (mínimo 32 caracteres). Es secreta. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE` | Primer administrador que crea `pnpm run db:seed`. |

## Publicación en Vercel + Turso

La app corre en Vercel y la base en Turso. Los comandos son de PowerShell (Windows).
El CLI de Turso en Windows necesita WSL, por eso la base se crea desde el panel web.

### 1. Crear la base en Turso

1. En https://app.turso.tech crear una base llamada `gestion-comercial`, en la región
   `AWS us-east-1` (la misma que usa Vercel por defecto).
2. Copiar la **URL** de la base (`libsql://gestion-comercial-<usuario>.aws-us-east-1.turso.io`).
3. Generar un **token** con permisos de lectura y escritura, sin vencimiento.
   El token es secreto: no se escribe en el código, en el chat ni en Git.

### 2. Crear las tablas y el administrador en Turso

En una terminal, dentro de la carpeta del proyecto. Las variables viven solo en esa
ventana de terminal:

```bash
$env:TURSO_DATABASE_URL = "libsql://gestion-comercial-<usuario>.aws-us-east-1.turso.io"; $env:TURSO_AUTH_TOKEN = Get-Clipboard
pnpm run db:migrate
$env:ADMIN_EMAIL = "<email>"; $env:ADMIN_PASSWORD = "<contraseña propia>"; $env:ADMIN_NOMBRE = "<nombre>"
pnpm run db:seed
```

- `Get-Clipboard` toma el token del portapapeles, así no queda escrito en la terminal.
- Hay que definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` propios: si no, el seed usaría los
  del `.env` (`admin12345`), que son públicos porque están en el repositorio.

### 3. Importar el repositorio en Vercel

1. En https://vercel.com (plan Hobby) elegir **Add New → Project** e importar el
   repositorio de GitHub. Vercel detecta Next.js solo.
2. No agregar la integración de Turso que ofrece Vercel: crearía otra base.
3. En **Settings → Environment Variables** cargar, para todos los entornos:
   - `TURSO_DATABASE_URL` (la URL de la base).
   - `TURSO_AUTH_TOKEN` (el token), marcada como *Sensitive*.
   - `SESSION_SECRET`, una clave nueva y distinta de la de desarrollo, también *Sensitive*.
     Se genera con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Las variables `ADMIN_*` **no** van en Vercel: el administrador ya se creó en el paso 2.

### 4. Publicar

Vercel despliega solo cada vez que se sube código a la rama `main`. Cuando termina,
se abre la URL pública y se entra con el email y la contraseña del administrador.
Si se cambia una variable de entorno, hay que volver a desplegar (**Deployments →
Redeploy**) para que tome el valor nuevo.

## Pruebas automáticas

```bash
pnpm test
```

Corren con vitest sobre una base SQLite **temporal** (en la carpeta temporal del sistema, con el
mismo esquema y las mismas migraciones que la aplicación). Nunca tocan `local.db` ni Turso: la
configuración vacía las variables de Turso y `pruebas/seguridad.ts` corta si la base no es la temporal.
Cubren la lista de control de la sección 10.8: venta sin stock sin datos parciales, dos ventas
simultáneas de la última unidad, un vendedor contra las operaciones de administrador, y existencia y
saldo que coinciden con sus movimientos.

# Guía de estudio para la defensa

## Etapa 0 — Preparación
- Qué se hizo: se verificaron las herramientas (Node, pnpm, git), se bajó la
  especificación del profe a `docs/`, se crearon los archivos de notas y se
  inicializó el repositorio git conectado a GitHub.
- Archivos clave:
  - `docs/requerimientos.md` → la especificación completa; ante cualquier duda, manda.
  - `docs/pantallas.html` → pantallas de referencia (contenido y flujos, no el diseño).
  - `.gitignore` → deja fuera de Git `node_modules`, `.next`, `.env` y las bases `*.db`.
  - `NOTAS-IA.md` → registro de errores de la IA y cómo se corrigieron.
  - `docs/ESTUDIO.md` → este archivo, una sección por etapa.
- Flujo explicado: antes de escribir código dejamos el entorno listo. Node corre
  Next.js, pnpm instala las dependencias (es el gestor que pide la sección 9) y
  git guarda la historia del proyecto. La especificación vive dentro del repo
  para que todos trabajemos sobre la misma versión. El `.gitignore` es parte de
  la seguridad: los secretos van en `.env` y nunca se suben; tampoco la base
  SQLite local, porque cada uno la genera con las migraciones y el seed.
- Preguntas probables del profe y su respuesta corta:
  - ¿Por qué `.env` no está en el repo? Porque tiene secretos (token de Turso,
    clave de la sesión). Se sube `.env.example` con los nombres, sin valores.
  - ¿Por qué no suben `local.db`? Porque se reconstruye con `db:migrate` y
    `db:seed`; subirla mezclaría datos de prueba de cada uno.
- Un cambio chico para practicar: agregar al `.gitignore` una carpeta nueva
  (por ejemplo `tmp/`) y comprobar con `git status` que deja de aparecer.

## Etapa 1 — Plan sin código
- Qué se hizo: se leyó la especificación completa y se acordó la estructura de
  carpetas, con una carpeta por capa. Se resolvieron cuatro dudas de la
  especificación. Todo quedó en `docs/ESTRUCTURA.md`.
- Archivos clave:
  - `docs/ESTRUCTURA.md` → árbol de carpetas, capas, dónde vive cada pieza y decisiones tomadas.
- Flujo explicado: el sistema tiene cuatro capas. `src/db/` define las tablas y
  la conexión. `src/servicios/` tiene TODAS las reglas de negocio: cada función
  valida con Zod, verifica el rol, aplica las reglas y devuelve. Los adaptadores
  (`app/api/**/route.ts` y `src/acciones/`) solo piden la sesión, llaman al
  servicio y responden. La interfaz muestra los datos y adelanta las
  validaciones con el mismo esquema Zod de `src/esquemas/`. Todos los módulos
  se recorren igual: esquema → servicio → route.ts / acción → pantalla. La
  existencia solo cambia en `moverStock()` (`servicios/stock.ts`), y la venta
  se confirma en `confirmarFactura()` (`servicios/facturas.ts`).
- Preguntas probables del profe y su respuesta corta:
  - ¿Dónde está la regla de que el pago no supera la deuda? En
    `src/servicios/pagos.ts`, y en ningún otro lado. La pantalla solo la adelanta.
  - ¿Por qué la existencia es una columna y el saldo no? Porque la existencia
    necesita el `UPDATE ... WHERE existencia >= ?` para que dos ventas
    simultáneas no vendan la misma unidad. El saldo se calcula siempre desde los
    movimientos, así no hay dos fuentes de verdad.
  - ¿Cuáles son las tres barreras de seguridad? El proxy (cookie), el layout del
    sistema (usuario válido en la base) y el servicio (rol → `403`).
- Un cambio chico para practicar: decidir en qué archivo iría una regla nueva,
  como «un producto no puede costar $ 0», y por qué ahí y no en la pantalla.

## Etapa 2 — Proyecto base
- Qué se hizo: se creó el proyecto Next.js (App Router, TypeScript, Tailwind) con
  shadcn/ui, Drizzle, libSQL y Zod. Se dejaron listas la conexión a la base, los
  scripts de la sección 9 y las tres piezas comunes: `ApiError`, el envoltorio
  de rutas y el módulo de formatos. Todavía no hay tablas ni pantallas.
- Archivos clave:
  - `src/db/conexion.ts` → decide si se usa SQLite local o Turso, y exporta `db`.
  - `drizzle.config.ts` → lo mismo para drizzle-kit (migraciones).
  - `src/db/esquema.ts` → vacío hasta la etapa 3, donde van las 9 tablas.
  - `src/db/seed.ts` → provisorio; en la etapa 3 crea el primer administrador.
  - `src/lib/api-error.ts` → clase `ApiError`, los códigos de la sección 11.8 y
    `aApiError()`, que convierte cualquier error al formato estándar.
  - `src/lib/ruta.ts` → envoltorio de los Route Handlers (sección 10.3).
  - `src/lib/formatos.ts` → único módulo de formatos (moneda, fechas, documento, numeración).
  - `.env.example` → nombres de las variables, sin valores.
  - `pnpm-workspace.yaml` → aprueba el script de instalación de `esbuild`.
  - `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx` → los genera shadcn/ui.
- Flujo explicado: al arrancar, `conexion.ts` mira las variables de entorno. Si
  están `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` se conecta a Turso; si falta
  alguna usa el archivo `local.db`. Eso hace que el mismo código sirva en la
  máquina y en Vercel. Cuando llega un pedido a la API, `ruta()` lee los
  parámetros y el JSON, llama a la función que le pasamos (después será un
  servicio) y arma la respuesta. Si algo lanza un error, `aApiError()` lo
  convierte: un `ApiError` sale tal cual, un error de Zod pasa a `422 VALIDACION`
  con el detalle por campo, y cualquier otra cosa pasa a `500` sin mostrar el
  detalle al cliente (queda en el log del servidor). Los importes viajan siempre
  en centavos y solo `formatos.ts` los convierte en `$ 12.345,50`.
- Preguntas probables del profe y su respuesta corta:
  - ¿Dónde decide la app si usa Turso o SQLite? En `src/db/conexion.ts`, con la
    constante `usaTurso`. `drizzle.config.ts` repite la misma regla para las migraciones.
  - ¿Por qué los servicios no devuelven respuestas HTTP? Porque lanzan `ApiError`
    y quien responde es el adaptador. Así el mismo servicio sirve a la API y a las Server Actions.
  - ¿Por qué un error inesperado dice solo «Ocurrió un error inesperado»? Para no
    filtrar detalles internos; el detalle va al log del servidor.
- Un cambio chico para practicar: agregar a `formatos.ts` una función que
  muestre un teléfono, o cambiar el prefijo de moneda de `$ ` a `ARS `.

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

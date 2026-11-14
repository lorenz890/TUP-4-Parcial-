# PLAN — 2º parcial Programación IV (grupo 6)

Plan de construcción por etapas. Claude Code hace UNA etapa por vez, frena,
yo pruebo, commiteo y le digo "seguí".

> Nota para mí (Lorenzo): las etapas 1 y 8 hacelas con `/model opus`; el resto
> con `/model sonnet`.

Hitos del profe (sección 12): Hito 1 = etapas 0 a 6 · Hito 2 = etapa 7 ·
Hito 3 = etapas 8 y 9 · Hito 4 = etapas 10 a 12.

## Formato de docs/ESTUDIO.md (al cerrar cada etapa)

```markdown
## Etapa N — Nombre
- Qué se hizo: (2 o 3 líneas)
- Archivos clave: (ruta → para qué sirve)
- Flujo explicado: (5 a 10 líneas, como se lo contaría al profe)
- Preguntas probables del profe y su respuesta corta: (2 o 3)
- Un cambio chico para practicar: (ej. "agregar el campo X a productos")
```

---

## [x] Etapa 0 — Preparación

- Verificá que estén instalados Node 22 o superior, pnpm y git. Si falta algo,
  decime cómo instalarlo en Windows, de a un comando.
- Creá la carpeta `docs/` y descargá ahí, del repo público
  https://github.com/AlejandroDiBattista/tup26-p4 (rama main, raíz del repo),
  los archivos `requerimientos.md` y `pantallas.html`.
- Creá `NOTAS-IA.md` (con un título y nada más) y `docs/ESTUDIO.md` (con un
  título y nada más).
- Inicializá git (si no está), con un `.gitignore` para Next.js que incluya
  `.env` y `*.db`.
- Guiame para conectar el repo con GitHub: yo creo el repo vacío en la web y
  vos me pasás los comandos de a uno.

Pruebo yo: que `docs/` tenga los dos archivos y que el repo esté en GitHub.

## [x] Etapa 1 — Plan sin código (usar Opus)

Leé CLAUDE.md y docs/requerimientos.md completos. Todavía no escribas código.
Proponeme la estructura de carpetas del proyecto, dónde va cada capa de la
sección 10 y en qué archivo vivirían moverStock(), la confirmación de factura,
ApiError, el envoltorio de las rutas y el módulo de formatos. Marcá cualquier
duda o contradicción que encuentres en la especificación. Guardá la estructura
acordada en docs/ESTRUCTURA.md.

Pruebo yo: que la estructura respete las cuatro capas y que la entienda. Si algo
no me cierra, lo cambiamos ahora.

## [ ] Etapa 2 — Proyecto base

Creá el proyecto según docs/ESTRUCTURA.md: Next.js con App Router y TypeScript,
Tailwind, shadcn/ui, Drizzle con @libsql/client y Zod, con pnpm. La conexión usa
una base SQLite local (file:local.db) si no hay variables de Turso, y Turso si
están TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
Agregá los scripts db:migrate, db:seed y dev para que funcionen los comandos de
instalación de la sección 9, y un .env.example.
Creá también la base común: ApiError con los códigos de la sección 11.8, el
envoltorio de Route Handlers de la sección 10.3 y el módulo de formatos.
Todavía no hagas tablas, pantallas ni funcionalidad.

Pruebo yo: que `pnpm run dev` levante, y dónde decide si usar la base local o
Turso.

## [ ] Etapa 3 — Esquema de datos

Definí con Drizzle las 9 tablas de la sección 7, con importes en centavos
enteros, claves únicas y relaciones. Generá la migración con drizzle-kit.
El script db:seed por ahora solo crea el primer administrador (RF-U3) leyendo
email y contraseña de variables de entorno.

Pruebo yo: el archivo del esquema tabla por tabla, la carpeta de migraciones, y
que `pnpm run db:migrate` y `pnpm run db:seed` funcionen.

## [ ] Etapa 4 — Sesión, usuarios y estructura

Implementá usuarios y acceso: RF-U1 a RF-U5, la sección 10.5 (las tres
barreras, y el usuario buscado en la base en cada pedido) y los endpoints de la
sección 11.3.
Interfaz: /login, el layout con panel lateral y barra superior de la sección 4
(solo con los módulos que existen hoy), /usuarios y /perfil.

Pruebo yo: entro como admin, creo un vendedor y pruebo que el vendedor no pueda
abrir /usuarios ni llamar a /api/usuarios.

## [ ] Etapa 5 — Publicar en Vercel + Turso

Guiame paso a paso, comandos de a uno: crear la base en Turso
(`gestion-comercial`), obtener URL y token, importar el repo en Vercel, cargar
las variables de entorno y correr migración y seed contra Turso. Documentá los
pasos en el README.

Pruebo yo: que el login funcione en la URL pública.

## [ ] Etapa 6 — Productos y stock

Implementá productos, categorías y existencias: RF-P1 a RF-P7, reglas 1, 2 y
12, y los endpoints de la sección 11.4.
moverStock() es la única función que cambia la existencia (sección 10.2).
El stock inicial se carga como ingreso.
Pantallas de la sección 4 para Productos, tomando el contenido de
docs/pantallas.html.

Pruebo yo: leo moverStock() línea por línea e intento un egreso mayor a la
existencia para ver qué responde.

## [ ] Etapa 7 — Clientes y cuenta corriente

Implementá clientes y cuenta corriente: RF-C1 a RF-C7, reglas 7, 8, 11 y 12, y
los endpoints de la sección 11.5. El saldo sale de movimientos_cuenta. Los
pagos generan recibo con numeración propia.
Pantallas del módulo Clientes según la sección 4 y docs/pantallas.html.
Todavía no hay facturas: dejá preparado el lugar de los débitos sin
implementarlos.

Pruebo yo: dónde se calcula el saldo y dónde se rechaza un pago mayor a la
deuda.

## [ ] Etapa 8 — Facturación en el servidor, con pruebas (usar Opus)

Implementá el servicio de facturas y sus endpoints de la sección 11.6:
RF-V5, RF-V6, RF-V8 y RF-V9, y las reglas 1 a 6 y 9 a 11.
La confirmación es una sola transacción: vuelve a verificar stock, asigna el
número 0001-00000001 al confirmar y sin huecos, toma los precios del servidor,
copia descripción y precio a factura_items, llama a moverStock() por ítem y
registra el débito si es cuenta corriente (respetando el límite de crédito).
La anulación hace lo inverso, solo admin y con motivo.
Todavía sin pantallas. Escribí pruebas automáticas para la lista de control
10.8: venta sin stock que no deja datos parciales, dos ventas simultáneas de
la última unidad, vendedor que llama a una ruta de admin, y existencia y saldo
que coinciden con sus movimientos.
En docs/ESTUDIO.md explicá la confirmación paso por paso, numerada.

Pruebo yo: leo la función de confirmación entera y corro las pruebas. Si no
pasan, se arreglan antes de seguir. Esta es la parte más preguntada.

## [ ] Etapa 9 — Pantallas de ventas

Hacé el módulo Ventas de la sección 4 según docs/pantallas.html: nueva venta
(RF-V1 a RF-V4, operable con teclado, alta de cliente en un modal sin perder la
venta), comprobante imprimible (RF-V7), listado de facturas con filtros y
paginado (RF-V8) y anulación con confirmación. La pantalla consume la API de
facturas; no repitas reglas en la interfaz más allá de adelantar validaciones.

Pruebo yo: la demo de la defensa (consumidor final en efectivo, cliente nuevo en
cuenta corriente, pago, anulación), mirando stock y saldo después de cada paso.

## [ ] Etapa 10 — Tablero

Implementá el tablero de inicio: RF-T1 a RF-T3 y el endpoint de la sección
11.7, con Chart.js y react-chartjs-2.

Pruebo yo: que los gráficos muestren datos reales de las ventas que hice.

## [ ] Etapa 11 — Datos de prueba y README

Completá el script de datos iniciales según la sección 10.7 y los datos de
prueba de la sección 8: 2 usuarios (uno por rol), 5 categorías, 30 productos,
10 clientes y 50 facturas en los últimos 30 días, creadas con los mismos
servicios que usa la app. Después escribí el README con todo lo que pide la
sección 12 (integrantes: Lorenzo Gaiser, Tomás Gómez Asat y Ulices — pedime el
apellido).

Pruebo yo: borro la base local, hago la instalación desde cero con los 5
comandos de la sección 9, y después cargamos los datos en Turso.

## [ ] Etapa 12 — Auditoría final

Revisá el proyecto entero contra la lista de control 10.8, las reglas de la
sección 6 y los requerimientos de interfaz de la sección 8. No cambies nada
todavía: dame una lista de lo que no se cumple, ordenada por importancia.
Después los arreglamos de a uno, con un commit por arreglo. Al final, armá un
informe corto con las líneas de código generadas y el tiempo de desarrollo.

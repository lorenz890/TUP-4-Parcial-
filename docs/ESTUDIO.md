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

## Etapa 3 — Esquema de datos
- Qué se hizo: se definieron con Drizzle las 9 tablas de la sección 7, con
  importes en centavos, claves únicas y claves foráneas. Se generó la primera
  migración con drizzle-kit y el seed crea el primer administrador (RF-U3).
- Archivos clave:
  - `src/db/esquema.ts` → las 9 tablas. Las listas de valores permitidos (roles, formas de pago, etc.) viven en `src/esquemas/valores.ts` y las usan tanto la base como los esquemas de Zod.
  - `migraciones/0000_esquema_inicial.sql` → el SQL que genera drizzle-kit; se aplica con `db:migrate` y no se edita a mano.
  - `src/db/seed.ts` → crea el primer administrador leyendo `ADMIN_EMAIL` y `ADMIN_PASSWORD` del entorno.
  - `.env.example` → ahora también lista las variables del administrador.
- Flujo explicado: cambiar una tabla es siempre lo mismo: se edita
  `esquema.ts`, se corre `pnpm run db:generate` (drizzle-kit compara el esquema
  con la última foto y escribe el SQL de la diferencia) y después
  `pnpm run db:migrate` lo aplica a la base elegida (local o Turso). El seed
  mira si el administrador ya existe, y si no, guarda su contraseña con bcrypt
  (nunca en texto plano). Las reglas más importantes ya quedan protegidas por la
  propia base: el código de producto y el documento del cliente son únicos, el
  número de factura no se puede repetir, y la existencia no puede ser negativa
  (CHECK). El saldo del cliente NO es una columna: sale de `movimientos_cuenta`.
- Preguntas probables del profe y su respuesta corta:
  - ¿Por qué los importes son enteros? Para no tener errores de redondeo del
    punto flotante: `1250000` son $ 12.500,00 y solo `formatos.ts` los convierte.
  - ¿Cómo evita la base vender stock que no hay? Con el CHECK `existencia >= 0`
    como última red, y además `moverStock()` descuenta con `WHERE existencia >= ?`.
  - ¿Por qué `factura_items` copia la descripción y el precio? Por la regla 3:
    si después cambia el precio del catálogo, las facturas viejas no cambian.
- Un cambio chico para practicar: agregar el campo `observaciones` (texto
  opcional) a `productos`: editar `esquema.ts`, correr `db:generate` y `db:migrate`.

## Etapa 4 — Sesión, usuarios y estructura
- Qué se hizo: login con cookie propia firmada, las tres barreras de la sección
  10.5, los 7 endpoints de la 11.3 (login, logout, me, cambio de contraseña y
  gestión de usuarios) y las pantallas `/login`, `/usuarios` y `/perfil` dentro
  de un layout con panel lateral y barra superior (se colapsa en el celular).
- Archivos clave:
  - `src/lib/cookie-sesion.ts` → arma y verifica la cookie `id.vencimiento.firma` (HMAC con `SESSION_SECRET`). No toca la base.
  - `src/lib/sesion.ts` → abre y cierra la cookie, y `usuarioActual()` busca al usuario en la base en cada pedido.
  - `src/proxy.ts` → barrera 1: sin cookie válida redirige a `/login` (o responde 401 en `/api`).
  - `src/app/(sistema)/layout.tsx` → barrera 2: si no hay usuario válido, vuelve al login; y arma el panel lateral y la barra superior.
  - `src/lib/permisos.ts` → `exigirAdmin()`, barrera 3: cada servicio la llama y responde 403.
  - `src/esquemas/auth.ts`, `usuarios.ts`, `comunes.ts` → los esquemas de Zod, compartidos por el servidor y los formularios.
  - `src/servicios/auth.ts`, `usuarios.ts` → las reglas (credenciales, email repetido, admin sobre sí mismo, contraseñas).
  - `src/lib/ruta.ts` y `src/lib/accion.ts` → envoltorios: exigen la sesión y convierten los errores (rutas y Server Actions).
  - `src/app/api/auth/**` y `src/app/api/usuarios/**` → las rutas: solo llaman al servicio.
  - `src/acciones/auth.ts`, `usuarios.ts` → Server Actions de los formularios; llaman a los mismos servicios.
  - `src/hooks/use-formulario.ts` → errores por campo y estado de envío de todos los formularios.
- Flujo explicado: el usuario entra con email y contraseña. El servicio
  `iniciarSesion` busca el email, compara el hash con bcrypt y devuelve el
  usuario; el adaptador (ruta o acción) abre la cookie firmada. Por la cookie
  viaja solo el id, la fecha de vencimiento y la firma. En cada pedido pasa por
  tres controles. 1) El proxy verifica la firma: sin cookie válida, a `/login`.
  2) La página o la ruta llama a `usuarioActual()`, que busca el usuario en la
  base: si está desactivado o no existe, no entra, aunque tenga cookie.
  3) El servicio llama a `exigirAdmin()`: un vendedor recibe `403` aunque llame
  a la API directo. Los formularios validan con el mismo esquema de Zod que el
  servidor (`esquemas/`), así los mensajes coinciden.
- Preguntas probables del profe y su respuesta corta:
  - ¿Qué pasa si desactivo a un usuario que está conectado? Pierde el acceso en
    su próximo pedido, porque `usuarioActual()` consulta la base cada vez.
  - ¿Se puede falsificar la cookie? No: lleva una firma HMAC con `SESSION_SECRET`.
    Si alguien cambia el id, la firma ya no coincide y se rechaza.
  - ¿Dónde está la regla «un admin no puede desactivarse a sí mismo»? En
    `editarUsuario()` de `servicios/usuarios.ts`. El botón oculto en la pantalla es solo ayuda visual.
  - ¿Por qué el login dice lo mismo si el email no existe o la clave está mal?
    Para no revelar qué emails están registrados.
- Un cambio chico para practicar: pedir al menos 10 caracteres en las
  contraseñas nuevas (se cambia en un solo lugar, `campoContrasenaNueva` en
  `esquemas/auth.ts`), o agregar un tercer rol.

## Etapa 5 — Publicar en Vercel + Turso
- Qué se hizo: se creó la base `gestion-comercial` en Turso, se le aplicaron la
  migración y el seed con los mismos scripts de siempre, y se importó el repositorio
  en Vercel con tres variables de entorno. Los pasos están en el README.
- Archivos clave:
  - `README.md` → puesta en marcha y publicación, paso a paso.
  - `src/db/conexion.ts` → sin cambios: con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` usa Turso, y si no, `local.db`.
  - `drizzle.config.ts` → la misma regla, para que `db:migrate` apunte a Turso.
- Flujo explicado: el código es el mismo en la máquina y en producción; lo único que
  cambia son las variables de entorno. Para preparar Turso se cargan la URL y el
  token en la terminal y se corren `db:migrate` (crea las tablas) y `db:seed` (crea el
  administrador). En Vercel se cargan `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y
  `SESSION_SECRET`; cada vez que se sube código a `main`, Vercel compila y publica.
  Los secretos nunca están en el repositorio: solo en Vercel y en la terminal.
- Preguntas probables del profe y su respuesta corta:
  - ¿Cómo sabe la app si usa SQLite o Turso? Por las variables de entorno, en
    `src/db/conexion.ts`. Si están las dos de Turso, usa Turso.
  - ¿Dónde está guardado el token de Turso? Solo en las variables de entorno de
    Vercel (como *Sensitive*) y nunca en el código ni en Git.
  - ¿Por qué `SESSION_SECRET` de producción es distinta de la de desarrollo? Porque
    la de desarrollo está en `.env.example`, que es público; con ella cualquiera
    podría firmar una cookie de sesión falsa.
- Un cambio chico para practicar: cambiar la contraseña del administrador de
  producción desde la pantalla de perfil de la URL pública.

## Etapa 6 — Productos y stock
- Qué se hizo: productos, categorías y movimientos de stock (RF-P1 a RF-P7, reglas 1, 2 y
  12), con los 8 endpoints de la sección 11.4 más el historial global. La existencia solo
  la cambia `moverStock()`. Pantallas: catálogo, pestaña de existencias y movimientos,
  ficha del producto (con ingreso, egreso, edición y baja) y categorías.
- Archivos clave:
  - `src/servicios/stock.ts` → `moverStock()` (la única función que cambia la existencia), el ingreso/egreso manual y la consulta de movimientos.
  - `src/servicios/productos.ts` → alta (el stock inicial entra como ingreso), edición, baja lógica y listado.
  - `src/servicios/categorias.ts` → alta, edición y baja (no se puede dar de baja con productos activos).
  - `src/esquemas/productos.ts`, `stock.ts`, `categorias.ts` → los esquemas de Zod, compartidos con los formularios.
  - `src/app/api/productos/**`, `categorias/**`, `movimientos-stock/` → las rutas: solo llaman al servicio.
  - `src/app/(sistema)/productos/**` → las pantallas; `src/components/productos/` y `categorias/` → sus diálogos, filtros y tablas.
  - `src/components/comunes/campo-importe.tsx` → el campo donde se escribe `12.500,50` y que entrega centavos.
- Flujo explicado: cada egreso (manual o, más adelante, una venta) llama a
  `moverStock(tx, ...)` dentro de una transacción. Esa función hace UNA sentencia:
  `UPDATE productos SET existencia = existencia + cantidad WHERE id = ? AND existencia + cantidad >= 0`.
  La condición la evalúa la propia base al mismo tiempo que cambia el valor, así que no
  hay un hueco entre «mirar si alcanza» y «descontar»: dos pedidos simultáneos por la
  última unidad no pueden pasar los dos, el segundo no modifica ninguna fila. Si no se
  modificó ninguna fila, la función mira por qué: si el producto no existe responde 404, y
  si no alcanza, 409 `STOCK_INSUFICIENTE` con lo solicitado y lo disponible. Si sí
  se modificó, graba el movimiento con la existencia resultante en la misma
  transacción. Por eso la suma de los movimientos de un producto siempre da su existencia.
- Preguntas probables del profe y su respuesta corta:
  - ¿Qué pasa si dos vendedores venden la última unidad a la vez? Las dos llaman a
    `moverStock()`; el `UPDATE ... WHERE existencia + cantidad >= 0` lo resuelve la base:
    una modifica la fila y la otra no, y recibe 409. Se probó con 6 pedidos simultáneos: 1 pasó y 5 dieron 409.
  - ¿Por qué `existencia` no se acepta en el `PATCH`? Porque los esquemas de edición son
    `.strict()`: cualquier campo no previsto se rechaza con 422, sin código extra.
  - ¿Dónde está la regla de que no se da de baja una categoría con productos activos? En
    `editarCategoria()` de `servicios/categorias.ts`; responde 409 `CATEGORIA_EN_USO`.
  - ¿Cómo se sabe que la existencia es correcta? Es igual a la suma de los movimientos
    (`cantidad` con signo) y además la base tiene un CHECK que impide una existencia negativa.
- Un cambio chico para practicar: pedir que el precio de un producto sea mayor a cero
  (hoy se acepta $ 0): se cambia en un solo lugar, `campoPrecio` en `esquemas/productos.ts`,
  y vale para el formulario y para la API.

## Etapa 7 — Clientes y cuenta corriente
- Qué se hizo: clientes con alta, edición y baja lógica, cuenta corriente con el saldo
  calculado, pagos con recibo numerado y los endpoints de la sección 11.5 (RF-C1 a RF-C7,
  reglas 7, 8, 11 y 12). Pantallas: listado, ficha con dos pestañas, saldos y recibo imprimible.
  Todavía no hay facturas: el lugar de los débitos queda listo, pero nada los graba.
- Archivos clave:
  - `src/servicios/clientes.ts` → clientes y `calcularSaldo()`, la única definición del saldo; también la cuenta corriente.
  - `src/servicios/pagos.ts` → `registrarPago()` y el recibo.
  - `src/esquemas/clientes.ts`, `pagos.ts` → los esquemas de Zod (documento, límite, importe, medio).
  - `src/app/api/clientes/**`, `pagos/` → las rutas: solo llaman al servicio.
  - `src/app/(sistema)/clientes/**` → las pantallas; `src/components/clientes/` → diálogos, filtros y tabla de cuenta.
  - `src/lib/comercio.ts` → datos fijos del comercio para los comprobantes.
- Flujo explicado: el saldo de un cliente NO está guardado en ninguna columna: es la suma de
  los débitos menos los créditos de `movimientos_cuenta` (`calcularSaldo`). Cuando se registra
  un pago, `registrarPago` abre una transacción y adentro hace todo: busca al cliente, verifica que
  tenga la cuenta corriente habilitada, calcula el saldo y rechaza el pago si es mayor
  (regla 8), toma el próximo número de recibo, graba el pago y graba el crédito en la
  cuenta. Como todo ocurre en una sola transacción, o se graba todo o nada. Calcular el
  saldo adentro de la transacción es lo que evita que dos pagos simultáneos se pasen de la deuda.
- Preguntas probables del profe y su respuesta corta:
  - ¿Dónde se calcula el saldo? En `calcularSaldo()` de `servicios/clientes.ts`. Los listados usan
    la misma fórmula, armada una sola vez en `sumaDeMovimientos()`.
  - ¿Dónde se rechaza un pago mayor a la deuda? En `registrarPago()` de `servicios/pagos.ts`
    (error 422 `PAGO_SUPERA_DEUDA`), después de calcular el saldo dentro de la transacción.
  - ¿Por qué no se puede dar de baja un cliente con saldo? Para no perder de vista una deuda:
    `editarCliente()` responde 422 `SALDO_PENDIENTE` si el saldo no es cero.
  - ¿Cómo evitan dos recibos con el mismo número? El número se toma dentro de la transacción
    ("el último + 1") y la tabla tiene un índice único por punto de venta y número.
- Un cambio chico para practicar: pedir que el teléfono de un cliente tenga al menos 6
  dígitos cuando se carga. Va en `esquemas/clientes.ts` y vale para el formulario y la API.

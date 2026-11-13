# Sistema de gestión comercial — 2º parcial Programación IV

La especificación completa está en docs/requerimientos.md. Las pantallas de
referencia están en docs/pantallas.html (solo contenido y flujos: el diseño
visual es propio, con shadcn/ui y Tailwind). Ante cualquier duda, manda
requerimientos.md.

El orden de trabajo está en PLAN.md. Leelo al empezar cada sesión y fijate qué
etapa sigue (la primera sin marcar).

## Forma de trabajo
- Trabajá UNA etapa de PLAN.md por vez. Cuando la termines, frená y esperá a
  que te diga "seguí". No anticipes funcionalidad de etapas siguientes.
- Al terminar cada etapa:
  1. Resumí qué archivos creaste o cambiaste y para qué sirve cada uno.
  2. Decime exactamente qué tengo que probar yo (en la app, no solo en el código).
  3. Agregá a docs/ESTUDIO.md la sección de esa etapa (ver formato en PLAN.md).
  4. Preguntame el mensaje del commit y hacé el commit con MIS palabras, tal cual
     te las paso. No inventes el mensaje.
  5. Marcá la etapa como hecha en PLAN.md ([x]).
- Si te tengo que correr comandos yo (Turso, Vercel, instalar algo), pasámelos
  DE A UNO y esperá el resultado antes del siguiente.
- Si encontrás una contradicción en requerimientos.md, preguntame antes de
  decidir.
- Si te corrijo un error, anotalo en NOTAS-IA.md (qué hiciste mal, cómo lo
  vimos, cómo se corrigió).

## Simplicidad (prioridad alta)
Este código lo tienen que explicar y modificar en vivo tres estudiantes en una
defensa oral. Preferí siempre lo simple y legible a lo astuto o "profesional".
- No agregues librerías fuera del stack sin preguntarme antes.
- Nada de abstracciones genéricas, helpers "por las dudas" ni patrones de más.
  Si algo se usa una sola vez, va escrito en el lugar.
- Funciones cortas, de una sola responsabilidad.
- Comentarios en español que expliquen el POR QUÉ, no el qué.
- Nombres de archivos, funciones y variables en español, como en la
  especificación.
- Todos los módulos siguen la misma forma: esquema Zod → servicio → route.ts →
  pantalla. Si entiendo un módulo, tengo que poder recorrer cualquier otro igual.

## Stack (obligatorio, sección 9)
TypeScript, Next.js con App Router, Route Handlers para la API REST, Tailwind,
shadcn/ui, Chart.js con react-chartjs-2, Drizzle ORM con migraciones de
drizzle-kit, SQLite local en desarrollo y Turso (libSQL) en producción, Zod,
pnpm. Despliegue en Vercel. Sesión propia en cookie firmada (sin Auth.js).

## Arquitectura (sección 10)
- Capas: acceso a datos, servicios, adaptadores (route.ts y Server Actions) e
  interfaz. Las reglas de negocio viven SOLO en los servicios.
- Cada función de servicio recibe el usuario autenticado y los datos sin
  validar, y sigue este orden: valida con Zod, verifica el rol, aplica las
  reglas y devuelve el resultado.
- Cada función de servicio lleva un comentario con el requerimiento o la regla
  que implementa, por ejemplo: // RF-V6, regla 1 y regla 4.
- Toda operación que toca más de una tabla va en una transacción.
- La existencia de un producto SOLO cambia en moverStock(), con un UPDATE
  condicionado (WHERE existencia >= ?) y el movimiento grabado en la misma
  transacción.
- El saldo del cliente sale de sus movimientos de cuenta.
- Una sola clase de error, ApiError, con los códigos de la sección 11.8.
- Los esquemas de Zod están en un módulo compartido entre formularios y
  servidor.
- Los formatos (moneda, fechas, documento, numeración) están en un único
  módulo.
- Importes siempre en centavos enteros.

## Seguridad
- Contraseñas con bcrypt. Sesión en cookie httpOnly firmada.
- Secretos solo en variables de entorno. Mantener .env.example actualizado y
  .env fuera de Git.

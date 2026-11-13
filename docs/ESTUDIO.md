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

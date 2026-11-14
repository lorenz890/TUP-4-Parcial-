import { ruta } from "@/lib/ruta";

// RF-U2. El usuario ya lo resolvió ruta() contra la base; sin sesión responde 401.
export const GET = ruta(async ({ usuario }) => usuario);

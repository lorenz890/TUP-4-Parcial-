import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components viene activado en la plantilla, pero obliga a envolver cada
  // lectura de la cookie de sesión en <Suspense>. No lo necesitamos: todas las
  // pantallas dependen del usuario, así que se dejan como páginas dinámicas comunes.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

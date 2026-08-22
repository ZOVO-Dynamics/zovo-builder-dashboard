import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "/home/ubuntu/zovo-builder-dashboard",
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // tesseract.js resout le chemin de son worker-script avec un require()
  // dynamique que le tracing de fichiers de Next ne sait pas suivre : le
  // build de production reecrit ce chemin vers un placeholder inexistant
  // ("/ROOT/node_modules/tesseract.js/..."), provoquant un crash silencieux
  // (uncaughtException, hors de la chaine de promesses) a chaque appel OCR
  // en production - constate sur /api/register. Exclure le paquet du
  // bundling/tracing du serveur le laisse se resoudre normalement via
  // node_modules au runtime.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;

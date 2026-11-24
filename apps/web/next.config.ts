import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // MSW 3 exporta `msw/browser` com condição `node: null`. O build do
  // Turbopack também empacota o client component no servidor e precisa do arquivo real.
  turbopack: {
    resolveAlias: {
      "msw/browser": path.join(root, "node_modules/msw/lib/browser/index.js"),
    },
  },
};

export default nextConfig;

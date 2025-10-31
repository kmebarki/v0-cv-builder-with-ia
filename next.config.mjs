// next.config.mjs (ESM) — recrée __dirname
import { fileURLToPath } from "url"
import { dirname } from "path"
import { withSentryConfig } from "@sentry/nextjs"
const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Évite l’avertissement "workspace root" de Turbopack
  reactStrictMode: true,
  turbopack: { root: __dirname },

  images: { unoptimized: true },

  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  // <-- Next 16: clé au niveau racine (pas dans experimental)
  serverExternalPackages: [
    "@opentelemetry/api",
    "@opentelemetry/instrumentation",
    "@sentry/node",
    "@sentry/node-core",
    "import-in-the-middle",
    "require-in-the-middle",
  ],

  // Garde si tu en as besoin (idéalement off en CI)
  typescript: { ignoreBuildErrors: true },
  
  // Optionnel mais pratique pour des déploiements Node/Docker
  // (et compatible avec withSentryConfig)
  output: "standalone",

}

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
  },
  {
    hideSourcemaps: true,
  },
)

// next.config.mjs (ESM) — recrée __dirname
import { fileURLToPath } from "url"
import { dirname } from "path"
import { withSentryConfig } from "@sentry/nextjs"
const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Évite l’avertissement "workspace root" de Turbopack
  turbopack: { root: __dirname },

  images: { unoptimized: true },

  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  // Garde si tu en as besoin (idéalement off en CI)
  typescript: { ignoreBuildErrors: true },
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

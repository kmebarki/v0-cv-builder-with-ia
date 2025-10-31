import type { Primitive } from "type-fest"

let sentry: typeof import("@sentry/nextjs") | null = null

export function getSentry() {
  if (sentry) return sentry
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require("@sentry/nextjs")
  } catch (error) {
    console.warn("Sentry non disponible", error)
    sentry = null
  }
  return sentry
}

export function captureAuthException(error: unknown, context?: Record<string, Primitive>) {
  const Sentry = getSentry()
  if (Sentry) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } else {
    console.error("[auth]", error, context)
  }
}

export function captureAuthMessage(message: string, context?: Record<string, Primitive>) {
  const Sentry = getSentry()
  if (Sentry) {
    Sentry.captureMessage(message, {
      level: "warning",
      extra: context,
    })
  } else {
    console.warn(`[auth] ${message}`, context)
  }
}

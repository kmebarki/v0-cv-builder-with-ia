import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { getRequestContext } from "@/lib/auth/context"
import { auth } from "@/lib/auth/server"
import { captureAuthException } from "@/lib/observability/sentry"

const PROVIDERS = {
  google: {
    enabled: () => env.oauth.google.enabled,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    params: (state: string) =>
      new URLSearchParams({
        client_id: env.oauth.google.clientId,
        redirect_uri: new URL("/api/auth/oauth/google/callback", env.appUrl).toString(),
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent",
        state,
      }),
  },
  github: {
    enabled: () => env.oauth.github.enabled,
    authorizationUrl: "https://github.com/login/oauth/authorize",
    params: (state: string) =>
      new URLSearchParams({
        client_id: env.oauth.github.clientId,
        redirect_uri: new URL("/api/auth/oauth/github/callback", env.appUrl).toString(),
        scope: "read:user user:email",
        state,
      }),
  },
} as const

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params
    const config = PROVIDERS[provider as keyof typeof PROVIDERS]

    if (!config) {
      return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 404 })
    }

    if (!config.enabled()) {
      return NextResponse.json({ error: "Fournisseur OAuth désactivé" }, { status: 400 })
    }

    const context = getRequestContext(request)
    const state = nanoid(48)

    await prisma.verificationToken.create({
      data: {
        identifier: provider,
        token: state,
        type: "OAUTH_STATE",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      },
    })

    await auth.trackEvent("oauth.start", "success", {
      ...context,
      reason: provider,
    })

    const url = `${config.authorizationUrl}?${config.params(state).toString()}`

    return NextResponse.json({ url })
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Impossible de démarrer l'authentification externe" }, { status: 500 })
  }
}

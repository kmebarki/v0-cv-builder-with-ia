import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { env } from "@/lib/env"
import { getRequestContext, getSessionToken } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

async function requireSession(request: Request) {
  const context = getRequestContext(request)
  const token = getSessionToken(env.betterAuth.sessionCookieName, request)
  const sessionResult = await auth.getSession(token, context)

  if (!sessionResult.success || !sessionResult.data) {
    return {
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    }
  }

  return {
    context,
    session: sessionResult.data,
    sessionToken: token,
  }
}

const verifySchema = z.object({ code: z.string().min(4) })

export async function POST(request: Request) {
  try {
    const authContext = await requireSession(request)
    if ("response" in authContext) return authContext.response

    if (!authContext.session.user.emailVerifiedAt) {
      return NextResponse.json({ error: "Email non vérifié" }, { status: 400 })
    }

    const result = await auth.enableTwoFactor(authContext.session.user.id, authContext.context)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error ?? "Impossible d'initialiser la 2FA" }, { status: 400 })
    }

    const response = NextResponse.json({ secret: result.data.secret, otpauthUrl: result.data.otpauthUrl })

    if (
      authContext.session.cookie &&
      authContext.session.cookie.value !== authContext.sessionToken
    ) {
      response.cookies.set(
        authContext.session.cookie.name,
        authContext.session.cookie.value,
        authContext.session.cookie.options,
      )
    }

    return response
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await requireSession(request)
    if ("response" in authContext) return authContext.response

    if (!authContext.session.user.emailVerifiedAt) {
      return NextResponse.json({ error: "Email non vérifié" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = verifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Code invalide", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await auth.verifyTwoFactorSetup(
      authContext.session.user.id,
      parsed.data.code,
      authContext.context,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Code invalide" }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    if (
      authContext.session.cookie &&
      authContext.session.cookie.value !== authContext.sessionToken
    ) {
      response.cookies.set(
        authContext.session.cookie.name,
        authContext.session.cookie.value,
        authContext.session.cookie.options,
      )
    }

    return response
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authContext = await requireSession(request)
    if ("response" in authContext) return authContext.response

    const result = await auth.disableTwoFactor(authContext.session.user.id, authContext.context)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Impossible de désactiver la 2FA" }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    if (
      authContext.session.cookie &&
      authContext.session.cookie.value !== authContext.sessionToken
    ) {
      response.cookies.set(
        authContext.session.cookie.name,
        authContext.session.cookie.value,
        authContext.session.cookie.options,
      )
    }

    return response
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

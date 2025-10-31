import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

interface ProviderHandlers {
  [key: string]: (params: {
    code: string
    redirectUri: string
  }) => Promise<{ email: string; emailVerified: boolean; firstName?: string | null; lastName?: string | null }>
}

async function fetchGoogleProfile({ code, redirectUri }: { code: string; redirectUri: string }) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.oauth.google.clientId,
      client_secret: env.oauth.google.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = (await tokenResponse.json()) as { access_token?: string; id_token?: string; error?: string }

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? "Google OAuth token error")
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  const profile = (await profileResponse.json()) as {
    email?: string
    email_verified?: boolean
    given_name?: string
    family_name?: string
    name?: string
  }

  if (!profile.email) {
    throw new Error("Impossible de récupérer l'email Google")
  }

  return {
    email: profile.email,
    emailVerified: Boolean(profile.email_verified),
    firstName: profile.given_name ?? profile.name ?? null,
    lastName: profile.family_name ?? null,
  }
}

async function fetchGithubProfile({ code, redirectUri }: { code: string; redirectUri: string }) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.oauth.github.clientId,
      client_secret: env.oauth.github.clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  })

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string }

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description ?? tokenData.error ?? "GitHub OAuth token error")
  }

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": env.appName,
      Accept: "application/vnd.github+json",
    },
  })

  const profile = (await profileResponse.json()) as { name?: string; email?: string }

  let email = profile.email ?? null
  let emailVerified = false

  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": env.appName,
        Accept: "application/vnd.github+json",
      },
    })

    const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>
    const primary = emails.find((item) => item.primary) ?? emails.find((item) => item.verified)

    if (!primary) {
      throw new Error("Impossible de récupérer l'email GitHub")
    }

    email = primary.email
    emailVerified = primary.verified
  } else {
    emailVerified = true
  }

  const [firstName, lastName] = (profile.name ?? "").split(" ", 2)

  return {
    email,
    emailVerified,
    firstName: firstName || null,
    lastName: lastName || null,
  }
}

const PROVIDER_HANDLERS: ProviderHandlers = {
  google: fetchGoogleProfile,
  github: fetchGithubProfile,
}

function errorRedirect(message: string) {
  const url = new URL("/auth/login", env.appUrl)
  url.searchParams.set("oauthError", message)
  return NextResponse.redirect(url)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const handler = PROVIDER_HANDLERS[provider]

  if (!handler) {
    return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 404 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return errorRedirect(error)
  }

  if (!code || !state) {
    return errorRedirect("Réponse OAuth invalide")
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token: state,
      type: "OAUTH_STATE",
      identifier: provider,
    },
  })

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return errorRedirect("Session OAuth expirée")
  }

  await prisma.verificationToken.delete({ where: { id: verificationToken.id } })

  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, env.appUrl).toString()
  const context = getRequestContext(request)

  try {
    const profile = await handler({ code, redirectUri })
    const normalizedEmail = profile.email.toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: { include: { role: true } } },
    })

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: existingUser.firstName ?? profile.firstName ?? undefined,
            lastName: existingUser.lastName ?? profile.lastName ?? undefined,
            emailVerifiedAt: existingUser.emailVerifiedAt ?? (profile.emailVerified ? new Date() : existingUser.emailVerifiedAt),
          },
          include: { roles: { include: { role: true } } },
        })
      : await prisma.user.create({
          data: {
            email: normalizedEmail,
            firstName: profile.firstName,
            lastName: profile.lastName,
            emailVerifiedAt: profile.emailVerified ? new Date() : null,
            roles: {
              create: {
                role: {
                  connectOrCreate: {
                    where: { name: "user" },
                    create: { name: "user", description: "Utilisateur standard" },
                  },
                },
              },
            },
          },
          include: { roles: { include: { role: true } } },
        })

    const sessionResult = await auth.createSessionForUser(user.id, context)

    if (!sessionResult.success || !sessionResult.data) {
      return errorRedirect(sessionResult.error ?? "Impossible de créer la session")
    }

    await auth.trackEvent("oauth.login", "success", {
      ...context,
      userId: user.id,
      reason: provider,
    })

    const redirectTarget = new URL("/dashboard", env.appUrl)
    const response = NextResponse.redirect(redirectTarget)

    response.cookies.set(
      sessionResult.data.cookie.name,
      sessionResult.data.cookie.value,
      sessionResult.data.cookie.options,
    )

    return response
  } catch (err) {
    captureAuthException(err)
    return errorRedirect("Authentification externe impossible")
  }
}

// lib/auth/session.ts
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"

const SESSION_COOKIE = process.env.BETTERAUTH_SESSION_COOKIE ?? "betterauth.session-token"

// Renvoie { session, user, cookie } ou redirige vers /auth/login
export async function requireSession(nextPath: string = "/dashboard") {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value

  const context = await getRequestContext()
  const result = await auth.getSession(token, context)

  if (!result.success || !result.data) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)
  }
  return result.data
}

// Version optionnelle si tu veux récupérer une session sans redirection
export async function getOptionalSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  const context = await getRequestContext()
  return auth.getSession(token, context) // BetterAuthResult<...>
}

import { auth } from "@/lib/auth/server"
import { env } from "@/lib/env"
import { getRequestContext, getSessionToken } from "@/lib/auth/context"

export async function requireSession() {
  const context = getRequestContext()
  const token = getSessionToken(env.betterAuth.sessionCookieName)
  const sessionResult = await auth.getSession(token, context)
  if (!sessionResult.success || !sessionResult.data) {
    return null
  }
  return sessionResult.data
}

export async function requireUser() {
  const session = await requireSession()
  return session?.user ?? null
}

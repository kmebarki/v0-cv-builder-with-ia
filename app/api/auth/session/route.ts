import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"
import { env } from "@/lib/env"
import { getRequestContext, getSessionToken } from "@/lib/auth/context"

export async function GET(request: Request) {
  const context = getRequestContext(request)
  const token = getSessionToken(env.betterAuth.sessionCookieName, request)
  const session = await auth.getSession(token, context)

  if (!session.success || !session.data) {
    return NextResponse.json({ user: null })
  }

  const response = NextResponse.json({ user: session.data.user })

  if (session.data.cookie && session.data.cookie.value !== token) {
    response.cookies.set(
      session.data.cookie.name,
      session.data.cookie.value,
      session.data.cookie.options,
    )
  }

  return response
}

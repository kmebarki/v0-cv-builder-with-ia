import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { auth } from "@/lib/auth/server"

const PUBLIC_PATHS = ["/auth", "/api/auth", "/public", "/_next", "/favicon", "/assets"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix))
}

function extractIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim()
  return request.ip ?? request.headers.get("x-real-ip") ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get(env.betterAuth.sessionCookieName)?.value
  const context = {
    ipAddress: extractIp(request),
    userAgent: request.headers.get("user-agent"),
  }

  const sessionResult = await auth.getSession(sessionToken, context)

  if (!sessionResult.success || !sessionResult.data) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/my-cvs")) {
      const url = new URL("/auth/login", request.url)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const response = NextResponse.next()

  if (sessionResult.data.cookie && sessionResult.data.cookie.value !== sessionToken) {
    response.cookies.set(
      sessionResult.data.cookie.name,
      sessionResult.data.cookie.value,
      sessionResult.data.cookie.options,
    )
  }

  const roles = sessionResult.data.user.roles

  if (pathname.startsWith("/admin")) {
    if (!roles.includes("admin")) {
      const url = new URL("/dashboard", request.url)
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

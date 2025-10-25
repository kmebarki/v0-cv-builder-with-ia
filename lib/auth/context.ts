import { cookies, headers } from "next/headers"
import type { BetterAuthRequestContext, SessionCookie } from "better-auth"

function extractHeaders(source?: Headers) {
  if (source) return source
  return headers()
}

export function getRequestContext(request?: Request): BetterAuthRequestContext {
  const headerList = request ? request.headers : extractHeaders()
  const cookieStore = cookies()

  const forwardedFor = headerList.get("x-forwarded-for")
  const realIp = headerList.get("x-real-ip")
  const userAgent = headerList.get("user-agent")

  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null

  return {
    ipAddress,
    userAgent,
    cookieWriter: (cookie: SessionCookie) => {
      if (!cookie.value) {
        cookieStore.delete(cookie.name)
        return
      }

      cookieStore.set(cookie.name, cookie.value, cookie.options)
    },
  }
}

export function getSessionToken(cookieName: string, request?: Request) {
  if (request) {
    const cookieHeader = request.headers.get("cookie")
    if (!cookieHeader) return undefined
    const cookiesArray = cookieHeader.split(";")
    for (const cookie of cookiesArray) {
      const [name, ...rest] = cookie.trim().split("=")
      if (name === cookieName) {
        return decodeURIComponent(rest.join("="))
      }
    }
    return undefined
  }

  const cookieStore = cookies()
  const sessionCookie = cookieStore.get(cookieName)
  return sessionCookie?.value
}

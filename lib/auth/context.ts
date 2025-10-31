// lib/auth/context.ts
import { headers } from "next/headers"
import type { BetterAuthRequestContext } from "@/lib/stubs/better-auth"

export async function getRequestContext(request?: Request): Promise<BetterAuthRequestContext> {
  // Si on t’appelle sans Request en RSC, on utilise headers() (asynchrone)
  const headerList = request ? request.headers : await headers()

  const forwardedFor = headerList.get("x-forwarded-for")
  const realIp = headerList.get("x-real-ip")
  const userAgent = headerList.get("user-agent")

  return {
    ipAddress: forwardedFor ?? realIp ?? null,
    userAgent: userAgent ?? null,
    // captchaToken sera injecté côté route API si besoin
  }
}

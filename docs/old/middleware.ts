+// proxy.ts — EDGE-SAFE (remplace l'ancien middleware.ts)
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// chemins accessibles sans session
const PUBLIC_PREFIXES = ['/auth', '/public', '/_next', '/favicon', '/assets', '/api/auth']

// nom du cookie de session (pas d'import server/env ici)
const SESSION_COOKIE = process.env.BETTERAUTH_SESSION_COOKIE ?? 'betterauth.session-token'

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}


export default function proxy(request: NextRequest) {

  const url = new URL(request.url)
  const { pathname } = url

  // Laisse passer tout le public
  if (isPublic(pathname)) return NextResponse.next()

  // Vérif minimale: présence du cookie de session
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ⚠️ Pas de contrôle de rôle ici (Edge). le faire côté Node (route handler).
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

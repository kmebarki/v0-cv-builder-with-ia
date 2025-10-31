// proxy.js — remplace middleware.ts (Next 16)
import { NextResponse } from 'next/server'

// chemins accessibles sans session
const PUBLIC_PREFIXES = ['/auth', '/public', '/_next', '/favicon', '/assets', '/api/auth']

// nom du cookie de session
const SESSION_COOKIE = process.env.BETTERAUTH_SESSION_COOKIE ?? 'betterauth.session-token'

function isPublic(pathname) {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export default function proxy(request) {
  const { pathname } = request.nextUrl

  // Laisse passer tout le public
  if (isPublic(pathname)) return NextResponse.next()

  // Vérif minimale: présence du cookie de session
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ⚠️ Pas de contrôle de rôle ici (Proxy). Faire ça côté Node (route handler).
  return NextResponse.next()
}

// Garde le matcher (exclut static/images/favicon)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

// ⚠️ Ne pas exporter `runtime` ici : interdit dans proxy.js (toujours Node.js)

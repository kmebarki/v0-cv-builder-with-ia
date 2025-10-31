// lib/auth/guards.ts
// ⚠️ Server-only (Node). Ne pas importer dans middleware / client components.
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { requireSession } from "@/lib/auth/session"


const DEFAULT_LOGIN = '/auth/login'

export type Session = Awaited<ReturnType<NonNullable<typeof auth.getSession>>>

export async function getSessionOrNull(): Promise<Session | null> {
  const session = await auth.getSession?.()
  return session ?? null
}

export function isAdmin(session: Session | null): boolean {
  if (!session) return false
  const roles = Array.isArray(session.user?.roles) ? session.user!.roles : []
  return roles.includes('admin') || (session.user as any)?.role === 'admin'
}

/**
 * Guard pour les PAGES/LAYOUTS (Server Components) :
 * - Redirige vers /auth/login?next=... si non connecté
 * - Redirige vers /dashboard si connecté mais non-admin
 */
export async function requireAdminPage(opts?: { next?: string; loginUrl?: string }) {
  const { next = '/dashboard/admin', loginUrl = DEFAULT_LOGIN } = opts ?? {}
  const session = await getSessionOrNull()
  if (!session) redirect(`${loginUrl}?next=${encodeURIComponent(next)}`)
  if (!isAdmin(session)) redirect('/dashboard')
  return session
}

/**
 * Guard pour les ROUTES API :
 * - 401 JSON si non connecté
 * - 403 JSON si non-admin
 * - Retourne la session si OK
 */
export async function requireAdminApi() {
  const session = await getSessionOrNull()
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) }
  }
  if (!isAdmin(session)) {
    return { ok: false as const, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { ok: true as const, session }
}

export async function requireEditorOrAdminApi(): Promise<
  | { session: any } // typage fin facultatif selon votre Session type
  | { error: NextResponse }
> {
  try {
    const session = await requireSession() // 401 si pas de session
    const roles: string[] = Array.isArray(session?.user?.roles) ? session.user.roles : []

    if (!roles.includes("admin") && !roles.includes("editor")) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) }
    }
    return { session }
  } catch {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) }
  }
}
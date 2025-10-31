export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/guards'
// import { prisma } from '@/lib/prisma' // si besoin

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  // const { session } = guard
  // ... logique admin ici
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  // const data = await req.json()
  // ... logique admin ici
  return NextResponse.json({ ok: true })
}

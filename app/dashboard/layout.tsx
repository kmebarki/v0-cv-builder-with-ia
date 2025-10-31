// app/dashboard/layout.tsx
export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic' // optionnel


import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.getSession?.()
  if (!session) {
    redirect('/auth/login?next=/dashboard')
  }
  return <>{children}</>
}

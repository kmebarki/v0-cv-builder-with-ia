export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic' // optionnel

import type { ReactNode } from 'react'
import { requireAdminPage } from '@/lib/auth/guards'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Redirigera automatiquement si non connecté / non-admin
  await requireAdminPage({ next: '/dashboard/admin' })
  return <>{children}</>
}

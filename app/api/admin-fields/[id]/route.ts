export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdminApi } from '@/lib/auth/guards'
import {
  adminFieldUpdateSchema,
  type AdminFieldUpdateInput,
} from '@/lib/editor/admin-field-schemas'
import {
  deleteAdminField,
  getAdminFieldById,
  updateAdminField,
} from '@/lib/editor/admin-fields'

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}
function notFound(id: string) {
  return NextResponse.json({ error: 'Champ introuvable', id }, { status: 404 })
}
function serverError(msg = 'Erreur serveur') {
  return NextResponse.json({ error: msg }, { status: 500 })
}

/** GET /api/admin-fields/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = params
  if (!id) return badRequest('Paramètre "id" manquant')

  try {
    const field = await getAdminFieldById(id)
    if (!field) return notFound(id)
    return NextResponse.json(field)
  } catch (err) {
    console.error('GET admin-field failed', err)
    return serverError()
  }
}

/** PUT /api/admin-fields/:id */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = params
  if (!id) return badRequest('Paramètre "id" manquant')

  try {
    const body = (await req.json()) as AdminFieldUpdateInput
    const payload = adminFieldUpdateSchema.parse(body)
    const updated = await updateAdminField(id, payload)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('PUT admin-field failed', err)
    return serverError('Impossible de mettre à jour le champ')
  }
}

/** DELETE /api/admin-fields/:id */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = params
  if (!id) return badRequest('Paramètre "id" manquant')

  try {
    await deleteAdminField(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE admin-field failed', err)
    return serverError('Impossible de supprimer le champ')
  }
}

import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { requireSession } from "@/lib/auth/session"
import { auth } from "@/lib/auth/server"
import {
  adminFieldUpdateSchema,
  type AdminFieldUpdateInput,
} from "@/lib/editor/admin-field-schemas"
import {
  deleteAdminField,
  getAdminFieldById,
  updateAdminField,
} from "@/lib/editor/admin-fields"

async function ensureAdmin() {
  const session = await requireSession()
  if (!session) {
    return { error: NextResponse.json({ error: "Authentification requise" }, { status: 401 }) }
  }

  const permissions = await auth.requireRole(session.user.id, ["admin"])
  if (!permissions.success) {
    return {
      error: NextResponse.json({ error: permissions.error ?? "Accès refusé" }, { status: 403 }),
    }
  }

  return { session }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin()
  if ("error" in guard) {
    return guard.error
  }

  const field = await getAdminFieldById(params.id)
  if (!field) {
    return NextResponse.json({ error: "Champ introuvable" }, { status: 404 })
  }

  return NextResponse.json(field)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin()
  if ("error" in guard) {
    return guard.error
  }

  try {
    const body = (await request.json()) as AdminFieldUpdateInput
    const payload = adminFieldUpdateSchema.parse(body)
    const updated = await updateAdminField(params.id, payload)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Unable to update admin field", error)
    return NextResponse.json({ error: "Impossible de mettre à jour le champ" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin()
  if ("error" in guard) {
    return guard.error
  }

  try {
    await deleteAdminField(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unable to delete admin field", error)
    return NextResponse.json({ error: "Impossible de supprimer le champ" }, { status: 500 })
  }
}

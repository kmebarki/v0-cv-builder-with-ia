import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { requireSession } from "@/lib/auth/session"
import { auth } from "@/lib/auth/server"
import {
  adminFieldQuerySchema,
  type AdminFieldCreateInput,
} from "@/lib/editor/admin-field-schemas"
import {
  createAdminField,
  listAdminFieldDefinitions,
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

export async function GET(request: Request) {
  const guard = await ensureAdmin()
  if ("error" in guard) {
    return guard.error
  }

  const url = new URL(request.url)
  const queryInput = {
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    visibility: url.searchParams.get("visibility") ?? undefined,
    fieldType: url.searchParams.get("fieldType") ?? undefined,
    exactKey: url.searchParams.get("exactKey") ?? undefined,
  }

  try {
    const query = adminFieldQuerySchema.parse(queryInput)
    const result = await listAdminFieldDefinitions(query)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Unable to list admin fields", error)
    return NextResponse.json({ error: "Impossible de récupérer les champs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = await ensureAdmin()
  if ("error" in guard) {
    return guard.error
  }

  try {
    const body = (await request.json()) as AdminFieldCreateInput
    const created = await createAdminField(body, { createdBy: guard.session.user.id })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Unable to create admin field", error)
    return NextResponse.json({ error: "Impossible de créer le champ" }, { status: 500 })
  }
}

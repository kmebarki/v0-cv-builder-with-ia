import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { captureAuthException } from "@/lib/observability/sentry"

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(12),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Requête invalide", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await auth.resetPassword(parsed.data)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Impossible de réinitialiser" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

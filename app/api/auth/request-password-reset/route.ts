import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

const schema = z.object({
  email: z.string().email(),
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

    const context = getRequestContext(request)
    const result = await auth.requestPasswordReset(parsed.data.email, context)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Impossible d'envoyer l'email" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

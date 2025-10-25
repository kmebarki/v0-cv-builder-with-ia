import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  captchaToken: z.string().optional(),
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
    context.captchaToken = parsed.data.captchaToken

    const result = await auth.register(
      {
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
      context,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Inscription impossible" }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: result.data?.user })
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

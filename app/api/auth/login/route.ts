import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
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

    const result = await auth.login(parsed.data, context)

    if (!result.success) {
      if (result.code === "two_factor_required") {
        return NextResponse.json({ requiresTwoFactor: true }, { status: 202 })
      }

      return NextResponse.json({ error: result.error ?? "Connexion impossible" }, { status: 401 })
    }

    const response = NextResponse.json({ success: true, user: result.data?.user })

    if (result.data?.cookie) {
      response.cookies.set(result.data.cookie.name, result.data.cookie.value, result.data.cookie.options)
    }

    return response
  } catch (error) {
    captureAuthException(error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

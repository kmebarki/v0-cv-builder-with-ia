// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { captureAuthException } from "@/lib/observability/sentry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
  captchaToken: z.string().optional(),
})

export async function POST(request: Request) {
// Sécurise le parsing JSON (évite SyntaxError → 500)

  const ct = request.headers.get('content-type') || ''
  if (!ct.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  try {
    let json: unknown
    try {
      json = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = schema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Requête invalide", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

   // Construit un contexte sûr & typed-safe
	const context = await getRequestContext(request)
    const origin = new URL(request.url).origin
    ;(context as any).baseUrl = origin
    ;(context as any).captchaToken = parsed.data.captchaToken



    let result: any
	try {
	  result = await auth.login(parsed.data, context)
	} catch (e: any) {
	  if (process.env.NODE_ENV !== "production") {
		console.error("[auth.login] threw:", e?.name, e?.message, e?.stack)
		return NextResponse.json(
		  { error: "INTERNAL_LOGIN_ERROR", reason: e?.message || "auth.login threw" },
		  { status: 500 },
		)
	  }
	  throw e
	}


    if (!result.success) {
      const code = (result.code || '').toString()
      const upper = code.toUpperCase()

      if (upper === "TWO_FACTOR_REQUIRED") {
        return NextResponse.json({ requiresTwoFactor: true, error: code }, { status: 401 })
      }
      if (upper === "EMAIL_NOT_VERIFIED") {
        return NextResponse.json({ error: code }, { status: 401 })
      }
      if (upper === "RATE_LIMITED") {
        return NextResponse.json({ error: code }, { status: 429 })
      }
      return NextResponse.json(
        { error: code || "AUTH_FAILED", reason: (result as any).message || (result as any).error || "Connexion impossible" },
        { status: 401 },
      )
    }


    const response = NextResponse.json({ success: true, user: result.data?.user })


    if (result.data?.cookie) {
      const { name, value, options } = result.data.cookie
      // Filtre défensif des options pour Next 16
      const {
        domain,
        expires,
        httpOnly,
        maxAge,
        path,
        sameSite,
        secure,
        priority,
      } = options || {}

      response.cookies.set(name, value, {
        domain,
        expires,
        httpOnly: Boolean(httpOnly),
        maxAge: typeof maxAge === 'number' ? maxAge : undefined,
        path: path || '/',
        sameSite: (sameSite as any) || 'lax',
        secure: Boolean(secure),
        ...(priority ? { priority } : {}),
      })
    }

    return response

    } catch (error: any) {
    // Log console + Sentry
    console.error('[auth/login] ERROR:', error?.stack || error)
    captureAuthException(error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

// Évite les 500 “fantômes” si un GET tombe ici
export async function GET() {
  return NextResponse.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 })
}
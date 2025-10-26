import { NextResponse } from "next/server"
import { getAdminFieldRuntime, serializeRuntime } from "@/lib/editor/admin-field-runtime"

export const runtime = "nodejs"

export async function GET() {
  try {
    const current = await getAdminFieldRuntime()
    const snapshot = serializeRuntime(current)
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Unable to load admin field runtime", error)
    return NextResponse.json({ error: "Runtime indisponible" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createZip } from "@/lib/server/zip"
import { buildDocxEntries, type DocxExportPayload } from "@/lib/server/docx-export"
import { validateAdminData } from "@/lib/editor/admin-field-runtime"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DocxExportPayload
    const validation = await validateAdminData(payload.cvData?.admin ?? {})
    if (!validation.success) {
      return NextResponse.json(
        { error: "Champs personnalisés invalides", details: validation.errors },
        { status: 400 },
      )
    }
    const entries = buildDocxEntries(payload)
    const zipBuffer = createZip(entries)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.cvName || "template")}.docx"`,
      },
    })
  } catch (error) {
    console.error("Docx export error", error)
    return NextResponse.json({ error: "Impossible de générer le DOCX" }, { status: 500 })
  }
}

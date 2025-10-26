import { NextResponse } from "next/server"
import { chromium } from "@playwright/test"
import fallbackTokens from "@/lib/editor/design-tokens.json"

export const runtime = "nodejs"

interface ExportPdfPayload {
  html: string
  styles: string
  mode: "a4" | "mobile" | "web"
  theme?: "light" | "dark"
  tokens?: any
  tokenSource?: string
}

const PAGE_FORMATS: Record<string, { width?: string; height?: string; format?: "A4" | "Letter" }> = {
  a4: { format: "A4" },
  mobile: { width: "90mm", height: "160mm" },
  web: { width: "210mm", height: "297mm" },
}

export async function POST(request: Request) {
  let browser
  try {
    const payload = (await request.json()) as ExportPdfPayload
    const { html, styles, mode, theme = "light", tokens } = payload
    const activeTokens = tokens ?? fallbackTokens
    const themeDefinition = activeTokens.themes?.[theme] ?? activeTokens.themes?.light ?? fallbackTokens.themes.light
    const darkTheme = activeTokens.themes?.dark ?? fallbackTokens.themes.dark

    browser = await chromium.launch({ args: ["--no-sandbox"] })
    const page = await browser.newPage()

    await page.setContent(
      `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page { margin: 0; }
              body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
                background: ${themeDefinition.background};
                color: ${themeDefinition.text};
              }
              .export-root {
                width: 100%;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                padding: 24px;
                box-sizing: border-box;
                background: ${themeDefinition.background};
              }
              .export-root > * {
                margin: 0 auto;
              }
              [data-template-page] {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              [data-template-page][data-template-theme="dark"] {
                background: ${darkTheme.surface};
                color: ${darkTheme.text};
              }
              ${styles}
            </style>
          </head>
          <body>
            <div class="export-root" data-export-theme="${theme}">${html}</div>
          </body>
        </html>` ,
      { waitUntil: "networkidle" },
    )

    const format = PAGE_FORMATS[mode] ?? PAGE_FORMATS.a4

    const pdfBuffer = await page.pdf({
      format: format.format,
      width: format.width,
      height: format.height,
      printBackground: true,
    })

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=template.pdf",
      },
    })
  } catch (error) {
    console.error("PDF export error", error)
    return NextResponse.json({ error: "Impossible de générer le PDF" }, { status: 500 })
  } finally {
    await browser?.close()
  }
}

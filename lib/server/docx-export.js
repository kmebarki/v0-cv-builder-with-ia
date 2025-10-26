import { createRequire } from "module"

const require = createRequire(import.meta.url)
const FALLBACK_TOKENS = require("../editor/design-tokens.json")

const DOCX_PAGE_SIZES = {
  a4: { w: 11907, h: 16839 },
  mobile: { w: 6800, h: 15120 },
  web: { w: 12240, h: 15840 },
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function paragraph(text, options) {
  const { bold = false, size = 24 } = options ?? {}
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:after="160" />
      </w:pPr>
      <w:r>
        <w:rPr>
          ${bold ? "<w:b/>" : ""}
          <w:sz w:val="${size}" />
          <w:szCs w:val="${size}" />
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  `
    .replace(/\s+\n/g, "")
    .replace(/\n/g, "")
}

function buildSummaryParagraphs(cvName, cvData, structure) {
  const blocks = []
  blocks.push(paragraph(cvName, { bold: true, size: 36 }))

  if (cvData?.user) {
    const user = cvData.user
    const identity = [user.firstName, user.lastName].filter(Boolean).join(" ")
    if (identity) {
      blocks.push(paragraph(identity, { bold: true, size: 30 }))
    }
    if (user.currentPosition) {
      blocks.push(paragraph(user.currentPosition, { size: 24 }))
    }
    if (user.professionalSummary) {
      blocks.push(paragraph(user.professionalSummary, { size: 22 }))
    }
  }

  if (Array.isArray(cvData?.experiences) && cvData.experiences.length > 0) {
    blocks.push(paragraph("Expériences", { bold: true, size: 28 }))
    cvData.experiences.slice(0, 6).forEach((experience) => {
      const header = [experience.position, experience.company].filter(Boolean).join(" — ")
      if (header) {
        blocks.push(paragraph(header, { bold: true, size: 24 }))
      }
      const range = [experience.startDate, experience.endDate]
        .filter(Boolean)
        .map((value) => new Date(value).toLocaleDateString("fr-FR"))
        .join(" → ")
      if (range) {
        blocks.push(paragraph(range, { size: 20 }))
      }
      if (experience.description) {
        blocks.push(paragraph(experience.description, { size: 20 }))
      }
    })
  }

  if (Array.isArray(cvData?.education) && cvData.education.length > 0) {
    blocks.push(paragraph("Formations", { bold: true, size: 28 }))
    cvData.education.slice(0, 6).forEach((education) => {
      const header = [education.degree, education.institution].filter(Boolean).join(" — ")
      if (header) {
        blocks.push(paragraph(header, { bold: true, size: 24 }))
      }
      const range = [education.startDate, education.endDate]
        .filter(Boolean)
        .map((value) => new Date(value).toLocaleDateString("fr-FR"))
        .join(" → ")
      if (range) {
        blocks.push(paragraph(range, { size: 20 }))
      }
      if (education.description) {
        blocks.push(paragraph(education.description, { size: 20 }))
      }
    })
  }

  if (Array.isArray(cvData?.skills) && cvData.skills.length > 0) {
    blocks.push(paragraph("Compétences", { bold: true, size: 28 }))
    const skillLine = cvData.skills
      .slice(0, 12)
      .map((skill) => skill.name || "")
      .filter(Boolean)
      .join(", ")
    if (skillLine) {
      blocks.push(paragraph(skillLine, { size: 20 }))
    }
  }

  try {
    const parsed = JSON.parse(structure)
    if (parsed?.nodes) {
      blocks.push(paragraph("Structure du template", { bold: true, size: 28 }))
      Object.values(parsed.nodes).forEach((node) => {
        if (node?.displayName) {
          blocks.push(paragraph(`• ${node.displayName}`, { size: 18 }))
        }
      })
    }
  } catch (error) {
    blocks.push(paragraph("Structure non lisible", { size: 18 }))
  }

  return blocks.join("")
}

function buildHtmlChunk(html, styles, theme, tokens) {
  const source = tokens ?? FALLBACK_TOKENS
  const palette = source.themes?.[theme] ?? source.themes?.light ?? FALLBACK_TOKENS.themes.light
  const darkPalette = source.themes?.dark ?? FALLBACK_TOKENS.themes.dark
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', sans-serif;
          background: ${palette.background};
          color: ${palette.text};
        }
        ${styles}
      </style>
    </head>
    <body data-theme="${theme}">
      <div data-docx-surface style="background:${palette.surface ?? palette.background};color:${palette.text}">${html}</div>
      <style>
        [data-template-page][data-template-theme="dark"],
        body[data-theme="dark"] [data-docx-surface] {
          background:${darkPalette.surface};
          color:${darkPalette.text};
        }
      </style>
    </body>
  </html>`
}

function buildDocumentXml(cvName, cvData, structure, mode) {
  const page = DOCX_PAGE_SIZES[mode] ?? DOCX_PAGE_SIZES.a4
  const summary = buildSummaryParagraphs(cvName, cvData, structure)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <w:body>
      <w:altChunk r:id="rIdHtml" />
      ${summary}
      <w:sectPr>
        <w:pgSz w:w="${page.w}" w:h="${page.h}" />
        <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0" />
      </w:sectPr>
    </w:body>
  </w:document>`
}

export function buildDocxEntries(payload) {
  const { cvName, cvData, structure, html, styles, mode, theme = "light", tokens } = payload
  const now = new Date().toISOString()
  const htmlChunk = buildHtmlChunk(html, styles, theme, tokens)
  const documentXml = buildDocumentXml(cvName, cvData, structure, mode)

  return [
    {
      path: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Default Extension="html" ContentType="text/html"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
        <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
        <Override PartName="/word/afchunk.html" ContentType="text/html"/>
      </Types>`,
    },
    {
      path: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
        <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
      </Relationships>`,
    },
    {
      path: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <dc:title>${escapeXml(cvName)}</dc:title>
        <dc:creator>CV Builder IA</dc:creator>
        <cp:lastModifiedBy>CV Builder IA</cp:lastModifiedBy>
        <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
        <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
      </cp:coreProperties>`,
    },
    {
      path: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
        <Application>CV Builder IA</Application>
      </Properties>`,
    },
    {
      path: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdHtml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/>
      </Relationships>`,
    },
    {
      path: "word/document.xml",
      data: documentXml,
    },
    {
      path: "word/afchunk.html",
      data: htmlChunk,
    },
  ]
}

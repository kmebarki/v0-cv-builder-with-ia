import test from "node:test"
import assert from "node:assert/strict"

import { buildDocxEntries } from "../lib/server/docx-export.js"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const tokens = require("../lib/editor/design-tokens.json")

const SAMPLE_PAYLOAD = {
  cvName: "CV Exemple",
  cvData: {
    user: {
      firstName: "Alex",
      lastName: "Martin",
      currentPosition: "Product Designer",
      professionalSummary: "10 ans d'expérience dans la conception de parcours utilisateurs complexes.",
    },
    experiences: [
      {
        position: "Lead Designer",
        company: "Innova",
        startDate: "2020-01-01",
        endDate: "2024-12-31",
        description: "Pilotage de la refonte complète du design system.",
      },
    ],
    education: [
      {
        degree: "Master UX",
        institution: "HEC",
        startDate: "2014-09-01",
        endDate: "2016-06-30",
        description: "Spécialisation en psychologie cognitive.",
      },
    ],
    skills: [
      { name: "Figma" },
      { name: "Design tokens" },
    ],
  },
  structure: JSON.stringify({ nodes: { root: { displayName: "Page" }, child: { displayName: "Section" } } }),
  html: '<div data-template-page data-template-theme="dark"><h1>Preview</h1></div>',
  styles: "h1{font-size:24px;color:#111827;}",
  mode: "a4",
  theme: "dark",
  tokens,
}

test("buildDocxEntries expose un chunk HTML et des relations valides", () => {
  const entries = buildDocxEntries(SAMPLE_PAYLOAD)

  const htmlEntry = entries.find((entry) => entry.path === "word/afchunk.html")
  assert.ok(htmlEntry, "Le chunk HTML doit être présent")
  assert.match(htmlEntry.data, /<h1>Preview<\/h1>/)
  assert.match(htmlEntry.data, /background: #020617/)

  const documentEntry = entries.find((entry) => entry.path === "word/document.xml")
  assert.ok(documentEntry)
  assert.match(documentEntry.data, /<w:altChunk r:id="rIdHtml"\s*\/>/)
  assert.match(documentEntry.data, /Lead Designer/)

  const relsEntry = entries.find((entry) => entry.path === "word/_rels/document.xml.rels")
  assert.ok(relsEntry)
  assert.match(relsEntry.data, /aFChunk/)
})

test("buildDocxEntries adapte la taille de page en fonction du mode", () => {
  const mobileEntries = buildDocxEntries({ ...SAMPLE_PAYLOAD, mode: "mobile" })
  const documentEntry = mobileEntries.find((entry) => entry.path === "word/document.xml")
  assert.ok(documentEntry)
  assert.match(documentEntry.data, /w:pgSz w:w="6800" w:h="15120"/)
})

import test from "node:test"
import assert from "node:assert/strict"

import { resolveCollection } from "../lib/editor/repeat-core.js"

const SAMPLE_DATA = {
  experiences: [
    { id: 1, position: "Designer", company: "Innova" },
    { id: 2, position: "Lead", company: "Nova" },
  ],
  languages: {
    fr: { label: "Français", level: "C2" },
    en: { label: "Anglais", level: "C1" },
  },
}

test("resolveCollection gère les tableaux et limite le nombre d'éléments", () => {
  const full = resolveCollection(SAMPLE_DATA, "experiences")
  assert.equal(full.length, 2)
  assert.equal(full[0].position, "Designer")

  const limited = resolveCollection(SAMPLE_DATA, "experiences", { maxItems: 1 })
  assert.equal(limited.length, 1)
  assert.equal(limited[0].company, "Innova")
})

test("resolveCollection transforme les objets en paires clé/valeur", () => {
  const languages = resolveCollection(SAMPLE_DATA, "languages")
  assert.equal(languages.length, 2)
  assert.deepEqual(languages[0], { key: "fr", label: "Français", level: "C2" })
})

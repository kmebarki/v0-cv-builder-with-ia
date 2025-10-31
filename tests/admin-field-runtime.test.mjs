import test from "node:test"
import assert from "node:assert/strict"

const schemaModulePromise = import("../lib/editor/admin-field-schema.ts")

const SAMPLE_FIELDS = [
  {
    id: "field-text",
    key: "custom_title",
    label: "Titre personnalisé",
    fieldType: "text",
    visibility: "profile",
    isRequired: true,
    config: { minLength: 3, maxLength: 50 },
    validations: {},
  },
  {
    id: "field-level",
    key: "skill_level",
    label: "Niveau",
    fieldType: "number",
    visibility: "profile",
    isRequired: false,
    config: {},
    validations: { min: 1, max: 5 },
  },
  {
    id: "field-language",
    key: "language_preference",
    label: "Langue",
    fieldType: "select",
    visibility: "profile",
    isRequired: true,
    config: { options: ["fr", "en", "es"] },
    validations: {},
  },
]

test("validateAdminPayload signale les erreurs de champs requis", async () => {
  const { validateAdminPayload } = await schemaModulePromise
  const result = validateAdminPayload(SAMPLE_FIELDS, { custom_title: "Bonjour" })
  assert.equal(result.success, false)
  assert.ok(result.errors.some((message) => message.includes("language_preference")))
})

test("normalizeAdminFieldValue convertit les types selon le schéma", async () => {
  const { normalizeAdminFieldValue } = await schemaModulePromise
  const numberField = SAMPLE_FIELDS[1]
  const selectField = SAMPLE_FIELDS[2]

  const numeric = normalizeAdminFieldValue(numberField, "4")
  assert.equal(numeric.ok, true)
  assert.equal(numeric.value, 4)

  const invalidNumeric = normalizeAdminFieldValue(numberField, "abc")
  assert.equal(invalidNumeric.ok, false)

  const selectValid = normalizeAdminFieldValue(selectField, "en")
  assert.equal(selectValid.ok, true)
  assert.equal(selectValid.value, "en")

  const selectInvalid = normalizeAdminFieldValue(selectField, "de")
  assert.equal(selectInvalid.ok, false)
})

test("buildAdminFieldJsonSchema marque les champs requis et autorise les valeurs conformes", async () => {
  const { buildAdminFieldJsonSchema } = await schemaModulePromise
  const schema = buildAdminFieldJsonSchema(SAMPLE_FIELDS)

  assert.deepEqual(schema.required.sort(), ["custom_title", "language_preference"].sort())
  assert.equal(schema.properties.custom_title.minLength, 3)
  assert.deepEqual(schema.properties.language_preference.enum, ["fr", "en", "es"])
})

import type { AdminFieldDefinition } from "./admin-fields.ts"
import { createAjv } from "./ajv-lite.ts"

export type AdminFieldJsonSchema = {
  type: "object"
  properties: Record<string, any>
  required: string[]
  additionalProperties: boolean
}

export function buildFieldSchema(field: AdminFieldDefinition) {
  const baseConfig = (field.config ?? {}) as Record<string, any>
  const validations = (field.validations ?? {}) as Record<string, any>

  switch (field.fieldType) {
    case "text":
    case "multiline":
      return {
        type: "string",
        minLength: typeof baseConfig.minLength === "number" ? baseConfig.minLength : undefined,
        maxLength: typeof baseConfig.maxLength === "number" ? baseConfig.maxLength : undefined,
        pattern: typeof validations.pattern === "string" ? validations.pattern : undefined,
      }
    case "number":
      return {
        type: "number",
        minimum: typeof validations.min === "number" ? validations.min : undefined,
        maximum: typeof validations.max === "number" ? validations.max : undefined,
      }
    case "boolean":
      return { type: "boolean" }
    case "date":
      return { type: "string", format: "date" }
    case "select": {
      const options = Array.isArray(baseConfig.options)
        ? baseConfig.options.map((option: any) => String(option.value ?? option))
        : []
      return options.length > 0
        ? { type: "string", enum: options }
        : { type: "string" }
    }
    case "json":
      return { type: ["object", "array", "string", "number", "boolean", "null"], nullable: true }
    case "media":
      return {
        anyOf: [
          {
            type: "object",
            properties: {
              id: { type: "string" },
              url: { type: "string", pattern: "^https?://" },
              type: { type: "string", nullable: true },
            },
            required: ["id", "url"],
            additionalProperties: true,
          },
          { type: "string", pattern: "^https?://" },
        ],
      }
    default:
      return { type: "string" }
  }
}

export function buildAdminFieldJsonSchema(fields: AdminFieldDefinition[]): AdminFieldJsonSchema {
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const field of fields) {
    const schema = buildFieldSchema(field)
    if (!field.isRequired) {
      schema.nullable = true
    }
    properties[field.key] = schema
    if (field.isRequired) {
      required.push(field.key)
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  }
}

export function validateAdminPayload(fields: AdminFieldDefinition[], payload: Record<string, any>) {
  const schema = buildAdminFieldJsonSchema(fields)
  const ajv = createAjv({ allErrors: true, coerceTypes: true })
  const validate = ajv.compile(schema)
  const success = validate(payload)
  const errors = validate.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`.trim()) ?? []
  return { success, errors }
}

export function normalizeAdminFieldValue(field: AdminFieldDefinition, value: any) {
  if (value === undefined) {
    return { ok: !field.isRequired, value: field.isRequired ? null : undefined }
  }

  switch (field.fieldType) {
    case "text":
    case "multiline":
      if (value === null || value === undefined) {
        return { ok: !field.isRequired, value: field.isRequired ? "" : value }
      }
      if (typeof value === "string") {
        return { ok: true, value }
      }
      return { ok: true, value: String(value) }
    case "number": {
      if (value === null || value === "") {
        return { ok: !field.isRequired, value: null }
      }
      const next = Number(value)
      if (Number.isNaN(next)) {
        return { ok: false, value: null }
      }
      return { ok: true, value: next }
    }
    case "boolean": {
      if (value === null || value === "") {
        return { ok: !field.isRequired, value: null }
      }
      if (typeof value === "boolean") {
        return { ok: true, value }
      }
      if (typeof value === "string") {
        if (/^(true|1|on)$/i.test(value)) return { ok: true, value: true }
        if (/^(false|0|off)$/i.test(value)) return { ok: true, value: false }
      }
      if (typeof value === "number") {
        if (value === 1) return { ok: true, value: true }
        if (value === 0) return { ok: true, value: false }
      }
      return { ok: false, value: null }
    }
    case "date": {
      if (!value) {
        return { ok: !field.isRequired, value: null }
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return { ok: false, value: null }
      }
      return { ok: true, value: date.toISOString().slice(0, 10) }
    }
    case "select": {
      const options = Array.isArray(field.config?.options)
        ? field.config!.options.map((option: any) => String(option.value ?? option))
        : []
      if (!value) {
        return { ok: !field.isRequired, value: null }
      }
      const asString = String(value)
      if (options.length === 0 || options.includes(asString)) {
        return { ok: true, value: asString }
      }
      return { ok: false, value: null }
    }
    case "json":
      if (value === null || value === undefined) {
        return { ok: !field.isRequired, value: null }
      }
      return { ok: true, value }
    case "media": {
      if (!value) {
        return { ok: !field.isRequired, value: null }
      }
      if (typeof value === "string") {
        if (!/^https?:\/\//i.test(value)) {
          return { ok: false, value: null }
        }
        return { ok: true, value }
      }
      if (typeof value === "object" && value !== null) {
        const { id, url, type } = value as Record<string, any>
        if (typeof url === "string" && /^https?:\/\//i.test(url) && typeof id === "string" && id.length > 0) {
          return { ok: true, value: { id, url, type: typeof type === "string" ? type : undefined } }
        }
      }
      return { ok: false, value: null }
    }
    default:
      return { ok: true, value }
  }
}

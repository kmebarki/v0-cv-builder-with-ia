export interface AjvLiteOptions {
  allErrors?: boolean
  coerceTypes?: boolean
}

export interface AjvLiteError {
  instancePath: string
  message: string
}

export interface AjvLiteValidateFunction<T = unknown> {
  (data: T): boolean
  errors: AjvLiteError[] | null
}

interface JsonSchema {
  type: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean
  enum?: any[]
  minLength?: number
  maxLength?: number
  pattern?: string
  minimum?: number
  maximum?: number
  format?: string
  items?: JsonSchema
  nullable?: boolean
  anyOf?: JsonSchema[]
}

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

function coerceNumber(value: any) {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

function coerceBoolean(value: any) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    if (/^(true|1|on)$/i.test(value)) return true
    if (/^(false|0|off)$/i.test(value)) return false
  }
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
  }
  return value
}

function validateValue({
  schema,
  data,
  path,
  errors,
  options,
}: {
  schema: JsonSchema
  data: any
  path: string
  errors: AjvLiteError[]
  options: AjvLiteOptions
}): boolean {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  const nullable = schema.nullable === true || types.includes("null")

  if (isNil(data)) {
    if (nullable) {
      return true
    }
    errors.push({ instancePath: path, message: "Valeur requise manquante" })
    return false
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    for (const candidate of schema.anyOf) {
      const nestedErrors: AjvLiteError[] = []
      const ok = validateValue({ schema: candidate, data, path, errors: nestedErrors, options })
      if (ok) {
        return true
      }
    }
    errors.push({ instancePath: path, message: "Aucune combinaison valide" })
    return false
  }

  let value = data

  for (const type of types) {
    switch (type) {
      case "string": {
        if (options.coerceTypes && typeof value !== "string") {
          value = value != null ? String(value) : value
        }
        if (typeof value === "string") {
          if (typeof schema.minLength === "number" && value.length < schema.minLength) {
            errors.push({ instancePath: path, message: `Doit contenir au moins ${schema.minLength} caractères` })
            return false
          }
          if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
            errors.push({ instancePath: path, message: `Doit contenir au plus ${schema.maxLength} caractères` })
            return false
          }
          if (schema.pattern) {
            const regex = new RegExp(schema.pattern)
            if (!regex.test(value)) {
              errors.push({ instancePath: path, message: "Format invalide" })
              return false
            }
          }
          if (Array.isArray(schema.enum) && schema.enum.length > 0) {
            if (!schema.enum.includes(value)) {
              errors.push({ instancePath: path, message: "Valeur non autorisée" })
              return false
            }
          }
          if (schema.format === "date") {
            const timestamp = Date.parse(value)
            if (Number.isNaN(timestamp)) {
              errors.push({ instancePath: path, message: "Date invalide" })
              return false
            }
          }
          return true
        }
        break
      }
      case "number": {
        if (options.coerceTypes) {
          value = coerceNumber(value)
        }
        if (typeof value === "number" && Number.isFinite(value)) {
          if (typeof schema.minimum === "number" && value < schema.minimum) {
            errors.push({ instancePath: path, message: `Doit être supérieur ou égal à ${schema.minimum}` })
            return false
          }
          if (typeof schema.maximum === "number" && value > schema.maximum) {
            errors.push({ instancePath: path, message: `Doit être inférieur ou égal à ${schema.maximum}` })
            return false
          }
          if (Array.isArray(schema.enum) && schema.enum.length > 0) {
            if (!schema.enum.includes(value)) {
              errors.push({ instancePath: path, message: "Valeur non autorisée" })
              return false
            }
          }
          return true
        }
        break
      }
      case "integer": {
        if (options.coerceTypes) {
          value = coerceNumber(value)
        }
        if (Number.isInteger(value)) {
          return true
        }
        break
      }
      case "boolean": {
        if (options.coerceTypes) {
          value = coerceBoolean(value)
        }
        if (typeof value === "boolean") {
          return true
        }
        break
      }
      case "array": {
        if (!Array.isArray(value)) {
          break
        }
        if (schema.items) {
          return value.every((entry, index) =>
            validateValue({
              schema: schema.items!,
              data: entry,
              path: `${path}/${index}`,
              errors,
              options,
            }),
          )
        }
        return true
      }
      case "object": {
        if (typeof value !== "object" || Array.isArray(value)) {
          break
        }
        const properties = schema.properties ?? {}
        const required = schema.required ?? []
        let success = true
        for (const key of required) {
          if (!Object.prototype.hasOwnProperty.call(value, key) || isNil((value as any)[key])) {
            errors.push({ instancePath: `${path}/${key}`, message: "Champ requis manquant" })
            success = false
          }
        }
        for (const [key, propertySchema] of Object.entries(properties)) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            const ok = validateValue({
              schema: propertySchema,
              data: (value as any)[key],
              path: `${path}/${key}`,
              errors,
              options,
            })
            if (!ok && !options.allErrors) {
              return false
            }
            success = success && ok
          }
        }
        if (schema.additionalProperties === false) {
          for (const key of Object.keys(value as any)) {
            if (!properties[key]) {
              errors.push({ instancePath: `${path}/${key}`, message: "Propriété non autorisée" })
              success = false
              if (!options.allErrors) {
                return false
              }
            }
          }
        }
        return success
      }
      case "null": {
        if (value === null) {
          return true
        }
        break
      }
      default:
        return true
    }
  }

  errors.push({ instancePath: path, message: `Type invalide (attendu: ${types.join(", ")})` })
  return false
}

export class AjvLite {
  private readonly options: Required<AjvLiteOptions>

  constructor(options: AjvLiteOptions = {}) {
    this.options = {
      allErrors: options.allErrors ?? true,
      coerceTypes: options.coerceTypes ?? true,
    }
  }

  compile<T = unknown>(schema: JsonSchema): AjvLiteValidateFunction<T> {
    const validator: AjvLiteValidateFunction<T> = ((data: T) => {
      const errors: AjvLiteError[] = []
      const success = validateValue({ schema, data, path: "", errors, options: this.options })
      validator.errors = errors.length > 0 ? errors : null
      return success
    }) as AjvLiteValidateFunction<T>

    validator.errors = null
    return validator
  }
}

export function createAjv(options?: AjvLiteOptions) {
  return new AjvLite(options)
}

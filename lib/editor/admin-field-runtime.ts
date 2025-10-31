import EventEmitter from "node:events"
import { getAdminFieldRegistry, type AdminFieldDefinition } from "./admin-fields.ts"
import { buildAdminFieldJsonSchema, validateAdminPayload } from "./admin-field-schema.ts"
import { createAjv } from "./ajv-lite.ts"

export interface AdminFieldRuntimeValidationResult {
  success: boolean
  errors: string[]
}

export interface AdminFieldRuntime {
  version: number
  fields: AdminFieldDefinition[]
  schema: ReturnType<typeof buildAdminFieldJsonSchema>
  validate: (payload: Record<string, any>) => AdminFieldRuntimeValidationResult
}

export interface AdminFieldRuntimeSnapshot {
  version: number
  fields: AdminFieldDefinition[]
  schema: ReturnType<typeof buildAdminFieldJsonSchema>
}

const emitter = new EventEmitter()
let cache: AdminFieldRuntime | null = null
let lastVersion = 0

function computeVersion(fields: AdminFieldDefinition[]) {
  const timestamps = fields.map((field) => (field.updatedAt ? new Date(field.updatedAt).getTime() : 0))
  const candidate = Math.max(Date.now(), ...timestamps)
  if (candidate <= lastVersion) {
    lastVersion += 1
    return lastVersion
  }
  lastVersion = candidate
  return lastVersion
}

async function composeRuntime(definitions?: AdminFieldDefinition[]): Promise<AdminFieldRuntime> {
  const fields = definitions ?? ((await getAdminFieldRegistry()) as AdminFieldDefinition[])
  const schema = buildAdminFieldJsonSchema(fields)
  const ajv = createAjv({ allErrors: true, coerceTypes: true })
  const validator = ajv.compile(schema)
  const version = computeVersion(fields)

  return {
    version,
    fields,
    schema,
    validate: (payload) => {
      const success = validator(payload ?? {})
      const errors = validator.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`.trim()) ?? []
      return { success, errors }
    },
  }
}

function emitUpdate(runtime: AdminFieldRuntime) {
  const snapshot = serializeRuntime(runtime)
  emitter.emit("update", snapshot)
}

export async function getAdminFieldRuntime(force = false) {
  if (!cache || force) {
    cache = await composeRuntime()
  }
  return cache
}

export async function refreshAdminFieldRuntime(definitions?: AdminFieldDefinition[]) {
  cache = await composeRuntime(definitions)
  emitUpdate(cache)
  return cache
}

export function serializeRuntime(runtime: AdminFieldRuntime | null = cache): AdminFieldRuntimeSnapshot | null {
  if (!runtime) return null
  return {
    version: runtime.version,
    fields: runtime.fields,
    schema: runtime.schema,
  }
}

export function subscribeAdminFieldRuntime(listener: (snapshot: AdminFieldRuntimeSnapshot) => void) {
  emitter.on("update", listener)
  return () => {
    emitter.off("update", listener)
  }
}

export async function validateAdminData(payload: Record<string, any>) {
  const runtime = await getAdminFieldRuntime()
  return runtime.validate(payload)
}

export function getAdminFieldRuntimeSnapshot() {
  return serializeRuntime()
}

export function validateAdminDataWithFields(fields: AdminFieldDefinition[], payload: Record<string, any>) {
  return validateAdminPayload(fields, payload)
}

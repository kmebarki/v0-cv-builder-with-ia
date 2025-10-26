import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  adminFieldCreateSchema,
  adminFieldQuerySchema,
  adminFieldUpdateSchema,
  normalizeAdminFieldKey,
  type AdminFieldCreateInput,
  type AdminFieldListQuery,
  type AdminFieldType,
  type AdminFieldUpdateInput,
} from "@/lib/editor/admin-field-schemas"
import { buildFieldSchema, normalizeAdminFieldValue } from "./admin-field-schema.ts"
import { createAjv } from "./ajv-lite.ts"

export type AdminFieldDefinition = {
  id: string
  key: string
  label: string
  description?: string | null
  fieldType: AdminFieldType
  config?: Record<string, any> | null
  validations?: Record<string, any> | null
  visibility: string
  isRequired: boolean
  createdBy?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type AdminFieldValue = {
  id: string
  fieldId: string
  userId: string
  cvId?: string | null
  value: any
}

async function refreshRuntimeCache(definitions?: AdminFieldDefinition[]) {
  const runtimeModule = await import("./admin-field-runtime.ts")
  if (definitions) {
    await runtimeModule.refreshAdminFieldRuntime(definitions)
    return
  }
  await runtimeModule.refreshAdminFieldRuntime()
}

async function reconcileAdminFieldValues(
  tx: Prisma.TransactionClient,
  previous: AdminFieldDefinition,
  next: AdminFieldDefinition,
) {
  if (previous.fieldType === next.fieldType) {
    const schema = buildFieldSchema(next)
    const ajv = createAjv({ allErrors: true, coerceTypes: true })
    const validate = ajv.compile({ ...schema, nullable: !next.isRequired })
    const values = await tx.adminFieldValue.findMany({ where: { fieldId: next.id } })

    for (const entry of values) {
      const normalized = normalizeAdminFieldValue(next, entry.value)
      if (!normalized.ok) {
        await tx.adminFieldValue.delete({ where: { id: entry.id } })
        continue
      }

      const valid = validate(normalized.value)
      if (!valid) {
        await tx.adminFieldValue.delete({ where: { id: entry.id } })
      } else if (normalized.value !== entry.value) {
        await tx.adminFieldValue.update({ where: { id: entry.id }, data: { value: normalized.value } })
      }
    }
    return
  }

  const values = await tx.adminFieldValue.findMany({ where: { fieldId: next.id } })
  for (const entry of values) {
    const normalized = normalizeAdminFieldValue(next, entry.value)
    if (!normalized.ok) {
      await tx.adminFieldValue.delete({ where: { id: entry.id } })
      continue
    }
    await tx.adminFieldValue.update({ where: { id: entry.id }, data: { value: normalized.value } })
  }
}

export async function getAdminFieldRegistry() {
  const fields = (await prisma.adminField.findMany({ orderBy: { createdAt: "asc" } })) as AdminFieldDefinition[]
  return fields
}

export async function listAdminFieldDefinitions(query: Partial<AdminFieldListQuery> = {}) {
  const parsed = adminFieldQuerySchema.parse(query)
  const { page, pageSize, search, visibility, fieldType, exactKey } = parsed

  const where: Prisma.AdminFieldWhereInput = {}

  if (search) {
    where.OR = [
      { key: { contains: search, mode: "insensitive" } },
      { label: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  if (visibility) {
    where.visibility = visibility
  }

  if (fieldType) {
    where.fieldType = fieldType
  }

  if (exactKey) {
    where.key = normalizeAdminFieldKey(exactKey)
  }

  const [items, total] = await Promise.all([
    prisma.adminField.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminField.count({ where }),
  ])

  return {
    items: items as AdminFieldDefinition[],
    total,
    page,
    pageSize,
  }
}

export async function getAdminFieldById(id: string) {
  const field = await prisma.adminField.findUnique({ where: { id } })
  if (!field) {
    return null
  }
  return field as AdminFieldDefinition
}

export async function createAdminField(
  input: AdminFieldCreateInput,
  options: { createdBy?: string | null } = {},
) {
  const normalized = {
    ...input,
    key: normalizeAdminFieldKey(input.key),
  }
  const payload = adminFieldCreateSchema.parse(normalized)

  const created = (await prisma.adminField.create({
    data: {
      key: payload.key,
      label: payload.label,
      description: payload.description === undefined ? undefined : payload.description,
      fieldType: payload.fieldType,
      visibility: payload.visibility,
      isRequired: payload.isRequired,
      config: payload.config,
      validations: payload.validations,
      createdBy: options.createdBy ?? null,
    },
  })) as AdminFieldDefinition

  await refreshRuntimeCache()

  return created
}

export async function updateAdminField(id: string, input: AdminFieldUpdateInput) {
  const existing = await prisma.adminField.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Admin field not found")
  }

  const normalizedKey = input.key ? normalizeAdminFieldKey(input.key) : undefined
  const nextDescription =
    input.description === undefined ? existing.description ?? undefined : input.description
  const merged = {
    key: normalizedKey ?? existing.key,
    label: input.label ?? existing.label,
    description: nextDescription,
    fieldType: input.fieldType ?? (existing.fieldType as AdminFieldType),
    visibility: input.visibility ?? existing.visibility,
    isRequired: input.isRequired ?? existing.isRequired,
    config: input.config ?? (existing.config as Record<string, any> | undefined),
    validations: input.validations ?? (existing.validations as Record<string, any> | undefined),
  }

  const payload = adminFieldCreateSchema.parse(merged)

  const updated = await prisma.$transaction(async (tx) => {
    const next = (await tx.adminField.update({
      where: { id },
      data: {
        key: payload.key,
        label: payload.label,
        description: payload.description === undefined ? undefined : payload.description,
        fieldType: payload.fieldType,
        visibility: payload.visibility,
        isRequired: payload.isRequired,
        config: payload.config,
        validations: payload.validations,
      },
    })) as AdminFieldDefinition

    await reconcileAdminFieldValues(tx, existing as AdminFieldDefinition, next)
    return next
  })

  await refreshRuntimeCache()

  return updated
}

export async function deleteAdminField(id: string) {
  await prisma.adminField.delete({ where: { id } })
  await refreshRuntimeCache()
}

export async function getAdminFieldValues(userId: string) {
  const values = (await prisma.adminFieldValue.findMany({
    where: { userId },
    include: { field: true },
  })) as (AdminFieldValue & { field: AdminFieldDefinition })[]

  return values
}

export function mergeAdminFields(
  baseData: Record<string, any>,
  values: (AdminFieldValue & { field: AdminFieldDefinition })[],
) {
  const merged = {
    ...baseData,
    admin: {
      ...(baseData.admin ?? {}),
    },
  }
  for (const value of values) {
    if (!value.field) continue
    merged.admin[value.field.key] = value.value
  }
  return merged
}

export function buildBindingTree(fields: AdminFieldDefinition[]) {
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    path: `admin.${field.key}`,
    description: field.description ?? undefined,
    fieldType: field.fieldType,
    visibility: field.visibility,
    required: field.isRequired,
  }))
}

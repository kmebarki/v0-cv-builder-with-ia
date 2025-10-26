import { z } from "zod"

export const adminFieldTypeEnum = z.enum([
  "text",
  "multiline",
  "number",
  "boolean",
  "date",
  "select",
  "json",
  "media",
])

export type AdminFieldType = z.infer<typeof adminFieldTypeEnum>

const keySchema = z
  .string()
  .min(1, "La clé est requise")
  .max(64, "La clé doit contenir au maximum 64 caractères")
  .regex(/^[a-zA-Z0-9_.-]+$/, "La clé ne peut contenir que des lettres, chiffres, points, tirets et underscores")

export const adminFieldBaseSchema = z.object({
  key: keySchema,
  label: z.string().min(1, "Le libellé est requis"),
  description: z
    .string()
    .max(255, "La description doit contenir au maximum 255 caractères")
    .optional()
    .nullable(),
  fieldType: adminFieldTypeEnum,
  visibility: z.string().min(1, "La visibilité est requise").default("profile"),
  isRequired: z.boolean().default(false),
  config: z.record(z.any()).optional(),
  validations: z.record(z.any()).optional(),
})

export const adminFieldCreateSchema = adminFieldBaseSchema.superRefine((data, ctx) => {
  if (data.fieldType === "select") {
    const options = data.config?.options
    if (!Array.isArray(options) || options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "options"],
        message: "Un champ select doit définir au moins une option",
      })
    }
  }
})

export const adminFieldUpdateSchema = adminFieldBaseSchema
  .partial()
  .extend({
    key: keySchema.optional(),
    fieldType: adminFieldTypeEnum.optional(),
  })

export type AdminFieldCreateInput = z.infer<typeof adminFieldCreateSchema>
export type AdminFieldUpdateInput = z.infer<typeof adminFieldUpdateSchema>

export const adminFieldQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  visibility: z.string().optional(),
  fieldType: adminFieldTypeEnum.optional(),
  exactKey: z.string().optional(),
})

export function normalizeAdminFieldKey(key: string) {
  return key
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .toLowerCase()
}

export type AdminFieldListQuery = z.infer<typeof adminFieldQuerySchema>

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  AlertTriangle,
  Check,
  FileWarning,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import {
  adminFieldTypeEnum,
  normalizeAdminFieldKey,
  type AdminFieldType,
} from "@/lib/editor/admin-field-schemas"

interface AdminField {
  id: string
  key: string
  label: string
  description?: string | null
  fieldType: AdminFieldType
  visibility: string
  isRequired: boolean
  config?: Record<string, unknown> | null
  validations?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

interface AdminFieldListResponse {
  items: AdminField[]
  total: number
  page: number
  pageSize: number
}

interface AdminFieldAdminProps {
  initialData: AdminFieldListResponse
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Requête invalide" }))
    throw new Error(payload.error ?? "Requête invalide")
  }
  return (await response.json()) as AdminFieldListResponse
}

const fieldTypes = adminFieldTypeEnum.options

interface GuidedState {
  [key: string]: unknown
}

type Mode = "guided" | "advanced"

interface FormState {
  key: string
  label: string
  description: string
  fieldType: AdminFieldType
  visibility: string
  isRequired: boolean
  configText: string
  validationsText: string
}

const defaultFormState: FormState = {
  key: "",
  label: "",
  description: "",
  fieldType: fieldTypes[0] ?? "text",
  visibility: "profile",
  isRequired: false,
  configText: "",
  validationsText: "",
}

interface SelectOptionState {
  id: string
  label: string
  value: string
  hint?: string
}

type KeyStatus = "idle" | "checking" | "available" | "duplicate" | "error"

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `opt_${Math.random().toString(36).slice(2, 10)}`
}

function formatJSON(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return ""
  }
  return JSON.stringify(value, null, 2)
}

function safeParseJSON(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = JSON.parse(trimmed)
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Le contenu doit être un objet JSON")
  }
  return parsed as Record<string, unknown>
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—"
  }
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

function getGuidedConfigDefaults(fieldType: AdminFieldType): GuidedState {
  switch (fieldType) {
    case "text":
    case "multiline":
      return { minLength: "", maxLength: "", placeholder: "" }
    case "number":
      return { unit: "" }
    case "date":
      return { displayFormat: "", minDate: "", maxDate: "" }
    case "select":
      return { allowMultiple: false, options: [{ id: generateId(), label: "", value: "", hint: "" }] }
    case "boolean":
      return { trueLabel: "Oui", falseLabel: "Non" }
    case "media":
      return { allowedTypes: "image/*", maxSizeMb: "" }
    case "json":
    default:
      return {}
  }
}

function getGuidedValidationDefaults(fieldType: AdminFieldType): GuidedState {
  switch (fieldType) {
    case "text":
    case "multiline":
      return { pattern: "" }
    case "number":
      return { min: "", max: "", step: "" }
    case "date":
      return { minDate: "", maxDate: "", format: "" }
    case "select":
      return { minSelections: "", maxSelections: "" }
    case "media":
      return { maxFiles: "", allowExternal: false }
    default:
      return {}
  }
}

const SUPPORTED_CONFIG_KEYS: Record<AdminFieldType, string[]> = {
  text: ["minLength", "maxLength", "placeholder"],
  multiline: ["minLength", "maxLength", "placeholder"],
  number: ["unit"],
  date: ["displayFormat", "minDate", "maxDate"],
  select: ["allowMultiple", "options"],
  boolean: ["trueLabel", "falseLabel"],
  json: [],
  media: ["allowedTypes", "maxSizeMb"],
}

const SUPPORTED_VALIDATION_KEYS: Record<AdminFieldType, string[]> = {
  text: ["pattern"],
  multiline: ["pattern"],
  number: ["min", "max", "step"],
  date: ["minDate", "maxDate", "format"],
  select: ["minSelections", "maxSelections"],
  boolean: [],
  json: [],
  media: ["maxFiles", "allowExternal"],
}

function deriveGuidedState(
  fieldType: AdminFieldType,
  value: Record<string, unknown> | undefined | null,
  defaults: GuidedState,
  allowedKeys: string[],
): { state: GuidedState; supported: boolean } {
  if (!value) {
    return { state: { ...defaults }, supported: true }
  }

  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key))
  if (unknownKeys.length > 0) {
    return { state: { ...defaults }, supported: false }
  }

  const nextState: GuidedState = { ...defaults }

  for (const key of allowedKeys) {
    if (key in value) {
      nextState[key] = value[key]
    }
  }

  if (fieldType === "select" && Array.isArray(value.options)) {
    nextState.options = (value.options as any[]).map((option) => ({
      id: generateId(),
      label: String(option.label ?? option.value ?? ""),
      value: String(option.value ?? option.label ?? ""),
      hint: option.hint ? String(option.hint) : "",
    }))
  }

  return { state: nextState, supported: true }
}

function buildGuidedConfig(fieldType: AdminFieldType, state: GuidedState): {
  payload?: Record<string, unknown>
  error?: string
} {
  switch (fieldType) {
    case "text":
    case "multiline": {
      const payload: Record<string, unknown> = {}
      const minLength = state.minLength
      const maxLength = state.maxLength
      if (minLength !== "" && minLength !== undefined) {
        const value = Number(minLength)
        if (Number.isNaN(value) || value < 0) {
          return { error: "La longueur minimale doit être un nombre positif" }
        }
        payload.minLength = value
      }
      if (maxLength !== "" && maxLength !== undefined) {
        const value = Number(maxLength)
        if (Number.isNaN(value) || value <= 0) {
          return { error: "La longueur maximale doit être un nombre positif" }
        }
        if (payload.minLength !== undefined && value < (payload.minLength as number)) {
          return { error: "La longueur maximale doit être supérieure ou égale à la longueur minimale" }
        }
        payload.maxLength = value
      }
      if (state.placeholder && typeof state.placeholder === "string") {
        payload.placeholder = state.placeholder
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "date": {
      const payload: Record<string, unknown> = {}
      if (state.displayFormat && typeof state.displayFormat === "string") {
        payload.displayFormat = state.displayFormat
      }
      if (state.minDate && typeof state.minDate === "string") {
        payload.minDate = state.minDate
      }
      if (state.maxDate && typeof state.maxDate === "string") {
        payload.maxDate = state.maxDate
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "select": {
      const allowMultiple = Boolean(state.allowMultiple)
      const options = Array.isArray(state.options) ? (state.options as SelectOptionState[]) : []
      const filtered = options.filter((option) => option.value.trim() !== "" || option.label.trim() !== "")
      if (filtered.length === 0) {
        return { error: "Ajoutez au moins une option pour le champ select" }
      }
      const payload: Record<string, unknown> = {
        allowMultiple,
        options: filtered.map((option) => ({
          value: option.value.trim() || option.label.trim(),
          label: option.label.trim() || option.value.trim(),
          ...(option.hint?.trim() ? { hint: option.hint.trim() } : {}),
        })),
      }
      return { payload }
    }
    case "boolean": {
      const payload: Record<string, unknown> = {}
      if (state.trueLabel && typeof state.trueLabel === "string") {
        payload.trueLabel = state.trueLabel
      }
      if (state.falseLabel && typeof state.falseLabel === "string") {
        payload.falseLabel = state.falseLabel
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "media": {
      const payload: Record<string, unknown> = {}
      if (state.allowedTypes && typeof state.allowedTypes === "string") {
        payload.allowedTypes = state.allowedTypes
      }
      if (state.maxSizeMb !== "" && state.maxSizeMb !== undefined) {
        const value = Number(state.maxSizeMb)
        if (Number.isNaN(value) || value <= 0) {
          return { error: "La taille maximale doit être un nombre positif" }
        }
        payload.maxSizeMb = value
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    default:
      return { payload: undefined }
  }
}

function buildGuidedValidations(fieldType: AdminFieldType, state: GuidedState): {
  payload?: Record<string, unknown>
  error?: string
} {
  switch (fieldType) {
    case "text":
    case "multiline": {
      const payload: Record<string, unknown> = {}
      if (state.pattern && typeof state.pattern === "string" && state.pattern.trim()) {
        try {
          new RegExp(state.pattern as string)
        } catch (error) {
          return { error: "Le pattern doit être une expression régulière valide" }
        }
        payload.pattern = state.pattern
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "number": {
      const payload: Record<string, unknown> = {}
      const min = state.min
      const max = state.max
      const step = state.step
      if (min !== "" && min !== undefined) {
        const value = Number(min)
        if (Number.isNaN(value)) {
          return { error: "Le minimum doit être un nombre" }
        }
        payload.min = value
      }
      if (max !== "" && max !== undefined) {
        const value = Number(max)
        if (Number.isNaN(value)) {
          return { error: "Le maximum doit être un nombre" }
        }
        if (payload.min !== undefined && value < (payload.min as number)) {
          return { error: "Le maximum doit être supérieur ou égal au minimum" }
        }
        payload.max = value
      }
      if (step !== "" && step !== undefined) {
        const value = Number(step)
        if (Number.isNaN(value) || value <= 0) {
          return { error: "Le pas doit être un nombre positif" }
        }
        payload.step = value
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "date": {
      const payload: Record<string, unknown> = {}
      if (state.minDate && typeof state.minDate === "string") {
        payload.minDate = state.minDate
      }
      if (state.maxDate && typeof state.maxDate === "string") {
        payload.maxDate = state.maxDate
      }
      if (state.format && typeof state.format === "string" && state.format.trim()) {
        payload.format = state.format
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "select": {
      const payload: Record<string, unknown> = {}
      const minSelections = state.minSelections
      const maxSelections = state.maxSelections
      if (minSelections !== "" && minSelections !== undefined) {
        const value = Number(minSelections)
        if (Number.isNaN(value) || value < 0) {
          return { error: "La sélection minimale doit être un nombre positif" }
        }
        payload.minSelections = value
      }
      if (maxSelections !== "" && maxSelections !== undefined) {
        const value = Number(maxSelections)
        if (Number.isNaN(value) || value <= 0) {
          return { error: "La sélection maximale doit être un nombre positif" }
        }
        if (payload.minSelections !== undefined && value < (payload.minSelections as number)) {
          return { error: "La sélection maximale doit être supérieure ou égale à la sélection minimale" }
        }
        payload.maxSelections = value
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    case "media": {
      const payload: Record<string, unknown> = {}
      if (state.maxFiles !== "" && state.maxFiles !== undefined) {
        const value = Number(state.maxFiles)
        if (Number.isNaN(value) || value <= 0) {
          return { error: "Le nombre de fichiers doit être un entier positif" }
        }
        payload.maxFiles = value
      }
      if (typeof state.allowExternal === "boolean") {
        payload.allowExternal = state.allowExternal
      }
      return { payload: Object.keys(payload).length > 0 ? payload : undefined }
    }
    default:
      return { payload: undefined }
  }
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: SelectOptionState[]
  onChange: (next: SelectOptionState[]) => void
}) {
  const updateOption = (id: string, patch: Partial<SelectOptionState>) => {
    onChange(options.map((option) => (option.id === id ? { ...option, ...patch } : option)))
  }

  const removeOption = (id: string) => {
    const filtered = options.filter((option) => option.id !== id)
    onChange(filtered.length > 0 ? filtered : [{ id: generateId(), label: "", value: "", hint: "" }])
  }

  const addOption = () => {
    onChange([...options, { id: generateId(), label: "", value: "", hint: "" }])
  }

  const duplicateValues = useMemo(() => {
    const counts = new Map<string, number>()
    for (const option of options) {
      const key = option.value.trim() || option.label.trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key))
  }, [options])

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const duplicate = duplicateValues.has(option.value.trim() || option.label.trim())
        return (
          <div key={option.id} className="grid gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Option {index + 1}</span>
              <div className="flex items-center gap-2">
                {duplicate ? (
                  <Badge variant="destructive" className="font-normal">
                    Doublon
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive"
                  onClick={() => removeOption(option.id)}
                  disabled={options.length === 1}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`option-label-${option.id}`}>Libellé</Label>
                <Input
                  id={`option-label-${option.id}`}
                  value={option.label}
                  onChange={(event) => updateOption(option.id, { label: event.target.value })}
                  placeholder="Ex : Débutant"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`option-value-${option.id}`}>Valeur</Label>
                <Input
                  id={`option-value-${option.id}`}
                  value={option.value}
                  onChange={(event) => updateOption(option.id, { value: event.target.value })}
                  placeholder="Ex : beginner"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`option-hint-${option.id}`}>Hint (facultatif)</Label>
              <Input
                id={`option-hint-${option.id}`}
                value={option.hint ?? ""}
                onChange={(event) => updateOption(option.id, { hint: event.target.value })}
                placeholder="Afficher une info bulle dans l’éditeur"
              />
            </div>
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une option
      </Button>
    </div>
  )
}

function PreviewPanel({
  title,
  data,
}: {
  title: string
  data: Record<string, unknown> | undefined
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
        {title} : aucune contrainte définie.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ListChecks className="h-4 w-4" /> {title}
      </div>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
export default function AdminFieldAdmin({ initialData }: AdminFieldAdminProps) {
  const [page, setPage] = useState(initialData.page)
  const [search, setSearch] = useState("")
  const [visibility, setVisibility] = useState("")
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<AdminField | null>(null)
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [configMode, setConfigMode] = useState<Mode>("guided")
  const [validationsMode, setValidationsMode] = useState<Mode>("guided")
  const [guidedConfig, setGuidedConfig] = useState<GuidedState>(
    getGuidedConfigDefaults(defaultFormState.fieldType),
  )
  const [guidedValidations, setGuidedValidations] = useState<GuidedState>(
    getGuidedValidationDefaults(defaultFormState.fieldType),
  )
  const [configJsonError, setConfigJsonError] = useState<string | null>(null)
  const [validationsJsonError, setValidationsJsonError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldPendingDeletion, setFieldPendingDeletion] = useState<AdminField | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle")
  const [normalizedKey, setNormalizedKey] = useState("")

  const pageSize = initialData.pageSize

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (search.trim()) {
      params.set("search", search.trim())
    }
    if (visibility.trim()) {
      params.set("visibility", visibility.trim())
    }
    if (fieldTypeFilter) {
      params.set("fieldType", fieldTypeFilter)
    }
    return params.toString()
  }, [page, pageSize, search, visibility, fieldTypeFilter])

  const swrKey = `/api/admin-fields?${queryString}`
  const { data, error, mutate, isValidating } = useSWR<AdminFieldListResponse>(swrKey, fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const resetForm = useCallback(() => {
    setFormState(defaultFormState)
    setGuidedConfig(getGuidedConfigDefaults(defaultFormState.fieldType))
    setGuidedValidations(getGuidedValidationDefaults(defaultFormState.fieldType))
    setConfigMode("guided")
    setValidationsMode("guided")
    setConfigJsonError(null)
    setValidationsJsonError(null)
    setFormError(null)
    setKeyStatus("idle")
    setNormalizedKey("")
  }, [])

  const checkKeyAvailability = useCallback(
    async (key: string, signal?: AbortSignal) => {
      const params = new URLSearchParams({ page: "1", pageSize: "1", exactKey: key })
      const response = await fetch(`/api/admin-fields?${params.toString()}`, { signal })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Impossible de vérifier la clé" }))
        throw new Error(payload.error ?? "Impossible de vérifier la clé")
      }
      const payload = (await response.json()) as AdminFieldListResponse
      const match = payload.items.find((item) => item.key === key)
      if (!match) {
        return false
      }
      if (editingField && match.id === editingField.id) {
        return false
      }
      return true
    },
    [editingField],
  )

  useEffect(() => {
    if (!dialogOpen) {
      return
    }
    const normalized = normalizeAdminFieldKey(formState.key)
    setNormalizedKey(normalized)
    if (!normalized) {
      setKeyStatus("idle")
      return
    }
    if (editingField && normalized === editingField.key) {
      setKeyStatus("available")
      return
    }
    let cancelled = false
    const controller = new AbortController()
    setKeyStatus("checking")
    const timer = window.setTimeout(async () => {
      try {
        const exists = await checkKeyAvailability(normalized, controller.signal)
        if (!cancelled) {
          setKeyStatus(exists ? "duplicate" : "available")
        }
      } catch (err) {
        if (!cancelled) {
          setKeyStatus("error")
        }
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [dialogOpen, formState.key, editingField, checkKeyAvailability])

  const openCreateDialog = () => {
    setEditingField(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (field: AdminField) => {
    setEditingField(field)
    setFormState({
      key: field.key,
      label: field.label,
      description: field.description ?? "",
      fieldType: field.fieldType,
      visibility: field.visibility ?? "profile",
      isRequired: field.isRequired,
      configText: formatJSON(field.config),
      validationsText: formatJSON(field.validations),
    })

    const configDefaults = getGuidedConfigDefaults(field.fieldType)
    const configDerived = deriveGuidedState(
      field.fieldType,
      field.config ?? undefined,
      configDefaults,
      SUPPORTED_CONFIG_KEYS[field.fieldType],
    )
    setGuidedConfig(configDerived.state)
    setConfigMode(configDerived.supported ? "guided" : "advanced")
    setConfigJsonError(null)

    const validationDefaults = getGuidedValidationDefaults(field.fieldType)
    const validationDerived = deriveGuidedState(
      field.fieldType,
      field.validations ?? undefined,
      validationDefaults,
      SUPPORTED_VALIDATION_KEYS[field.fieldType],
    )
    setGuidedValidations(validationDerived.state)
    setValidationsMode(validationDerived.supported ? "guided" : "advanced")
    setValidationsJsonError(null)
    setFormError(null)
    setDialogOpen(true)
  }

  useEffect(() => {
    if (!dialogOpen) {
      return
    }
    const defaultsConfig = getGuidedConfigDefaults(formState.fieldType)
    setGuidedConfig((previous) => ({
      ...defaultsConfig,
      ...Object.fromEntries(
        Object.entries(previous).filter(([key]) => SUPPORTED_CONFIG_KEYS[formState.fieldType].includes(key)),
      ),
    }))
    const defaultsValidation = getGuidedValidationDefaults(formState.fieldType)
    setGuidedValidations((previous) => ({
      ...defaultsValidation,
      ...Object.fromEntries(
        Object.entries(previous).filter(([key]) => SUPPORTED_VALIDATION_KEYS[formState.fieldType].includes(key)),
      ),
    }))
    if (configMode === "guided") {
      setFormState((prev) => ({ ...prev, configText: "" }))
    }
    if (validationsMode === "guided") {
      setFormState((prev) => ({ ...prev, validationsText: "" }))
    }
  }, [dialogOpen, formState.fieldType, configMode, validationsMode])

  const configPreview = useMemo(() => {
    if (configMode === "advanced") {
      if (configJsonError || !formState.configText.trim()) {
        return undefined
      }
      try {
        return safeParseJSON(formState.configText)
      } catch (error) {
        return undefined
      }
    }
    const { payload } = buildGuidedConfig(formState.fieldType, guidedConfig)
    return payload
  }, [configMode, formState.configText, configJsonError, formState.fieldType, guidedConfig])

  const validationsPreview = useMemo(() => {
    if (validationsMode === "advanced") {
      if (validationsJsonError || !formState.validationsText.trim()) {
        return undefined
      }
      try {
        return safeParseJSON(formState.validationsText)
      } catch (error) {
        return undefined
      }
    }
    const { payload } = buildGuidedValidations(formState.fieldType, guidedValidations)
    return payload
  }, [validationsMode, formState.validationsText, validationsJsonError, formState.fieldType, guidedValidations])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      if (!formState.label.trim()) {
        throw new Error("Le libellé est obligatoire")
      }

      const normalized = normalizeAdminFieldKey(formState.key)
      if (!normalized) {
        throw new Error("La clé du champ est obligatoire")
      }

      const isDuplicate = await checkKeyAvailability(normalized)
      if (isDuplicate) {
        setKeyStatus("duplicate")
        throw new Error("Cette clé existe déjà. Choisissez une clé unique.")
      }

      let configPayload: Record<string, unknown> | undefined
      if (configMode === "guided") {
        const { payload, error: configError } = buildGuidedConfig(formState.fieldType, guidedConfig)
        if (configError) {
          throw new Error(configError)
        }
        configPayload = payload
      } else {
        if (configJsonError) {
          throw new Error(configJsonError)
        }
        configPayload = formState.configText.trim() ? safeParseJSON(formState.configText) : undefined
      }

      let validationsPayload: Record<string, unknown> | undefined
      if (validationsMode === "guided") {
        const { payload, error: validationsError } = buildGuidedValidations(
          formState.fieldType,
          guidedValidations,
        )
        if (validationsError) {
          throw new Error(validationsError)
        }
        validationsPayload = payload
      } else {
        if (validationsJsonError) {
          throw new Error(validationsJsonError)
        }
        validationsPayload = formState.validationsText.trim()
          ? safeParseJSON(formState.validationsText)
          : undefined
      }

      const payload = {
        key: normalized,
        label: formState.label.trim(),
        description: formState.description.trim() ? formState.description.trim() : null,
        fieldType: formState.fieldType,
        visibility: formState.visibility.trim() || "profile",
        isRequired: formState.isRequired,
        config: configPayload,
        validations: validationsPayload,
      }

      const response = await fetch(
        editingField ? `/api/admin-fields/${editingField.id}` : "/api/admin-fields",
        {
          method: editingField ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        const message = await response.json().catch(() => ({ error: "Action impossible" }))
        throw new Error(message.error ?? "Action impossible")
      }

      toast.success(editingField ? "Champ mis à jour" : "Champ créé")
      setDialogOpen(false)
      resetForm()
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action impossible"
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRequest = (field: AdminField) => {
    setFieldPendingDeletion(field)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const confirmDeletion = async () => {
    if (!fieldPendingDeletion) {
      return
    }
    setDeleteError(null)
    try {
      const response = await fetch(`/api/admin-fields/${fieldPendingDeletion.id}`, { method: "DELETE" })
      if (!response.ok) {
        const message = await response.json().catch(() => ({ error: "Suppression impossible" }))
        throw new Error(message.error ?? "Suppression impossible")
      }
      toast.success("Champ supprimé")
      setDeleteDialogOpen(false)
      setFieldPendingDeletion(null)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Suppression impossible"
      setDeleteError(message)
      toast.error(message)
    }
  }

  const handleRefresh = async () => {
    await mutate()
  }

  const keyStatusMessage = useMemo(() => {
    switch (keyStatus) {
      case "duplicate":
        return "Cette clé est déjà utilisée."
      case "available":
        return normalizedKey ? `Clé disponible : ${normalizedKey}` : null
      case "error":
        return "Impossible de vérifier la disponibilité."
      case "checking":
        return "Vérification en cours..."
      default:
        return normalizedKey ? `Clé normalisée : ${normalizedKey}` : null
    }
  }, [keyStatus, normalizedKey])
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Champs personnalisés</CardTitle>
            <CardDescription>
              Configurez les champs administrateur, leurs validations et leur visibilité pour l’éditeur de templates.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isValidating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
            </Button>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                  setEditingField(null)
                  resetForm()
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Nouveau champ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingField ? "Modifier le champ" : "Nouveau champ"}</DialogTitle>
                  <DialogDescription>
                    Chaque type de champ dispose d’assistants dédiés pour générer les validations adaptées. Basculez en mode
                    avancé pour saisir du JSON libre si nécessaire.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="field-key">Clé *</Label>
                      <Input
                        id="field-key"
                        value={formState.key}
                        onChange={(event) =>
                          setFormState((previous) => ({ ...previous, key: event.target.value }))
                        }
                        placeholder="ex: candidate_favorite_color"
                      />
                      {keyStatusMessage ? (
                        <p
                          className={
                            keyStatus === "duplicate"
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {keyStatusMessage}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-label">Libellé *</Label>
                      <Input
                        id="field-label"
                        value={formState.label}
                        onChange={(event) =>
                          setFormState((previous) => ({ ...previous, label: event.target.value }))
                        }
                        placeholder="Couleur favorite"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-description">Description</Label>
                    <Input
                      id="field-description"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, description: event.target.value }))
                      }
                      placeholder="Information affichée dans le panneau de binding"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={formState.fieldType}
                        onValueChange={(value) =>
                          setFormState((previous) => ({
                            ...previous,
                            fieldType: value as AdminFieldType,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type du champ" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-visibility">Visibilité *</Label>
                      <Input
                        id="field-visibility"
                        value={formState.visibility}
                        onChange={(event) =>
                          setFormState((previous) => ({ ...previous, visibility: event.target.value }))
                        }
                        placeholder="profile, template, cv..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="field-required"
                      checked={formState.isRequired}
                      onCheckedChange={(value) =>
                        setFormState((previous) => ({ ...previous, isRequired: Boolean(value) }))
                      }
                    />
                    <Label htmlFor="field-required">Champ obligatoire</Label>
                  </div>

                  <Tabs value={configMode} onValueChange={(value) => setConfigMode(value as Mode)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Configuration du champ</span>
                        {configMode === "guided" ? (
                          <Badge variant="secondary">Assistant</Badge>
                        ) : (
                          <Badge variant="outline">JSON libre</Badge>
                        )}
                      </div>
                      <TabsList>
                        <TabsTrigger value="guided">Assistant</TabsTrigger>
                        <TabsTrigger value="advanced">JSON</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="guided" className="space-y-4">
                      {formState.fieldType === "text" || formState.fieldType === "multiline" ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Longueur minimale</Label>
                            <Input
                              type="number"
                              min={0}
                              value={guidedConfig.minLength ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  minLength: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                              placeholder="ex: 3"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Longueur maximale</Label>
                            <Input
                              type="number"
                              min={1}
                              value={guidedConfig.maxLength ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  maxLength: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                              placeholder="ex: 120"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Placeholder</Label>
                            <Input
                              value={guidedConfig.placeholder ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  placeholder: event.target.value,
                                }))
                              }
                              placeholder="Texte indicatif"
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "number" ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Unité</Label>
                            <Input
                              value={guidedConfig.unit ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({ ...previous, unit: event.target.value }))
                              }
                              placeholder="ex: %"
                            />
                          </div>
                          <p className="md:col-span-2 text-xs text-muted-foreground">
                            Les limites et le pas sont gérés dans l’onglet Validations.
                          </p>
                        </div>
                      ) : null}
                      {formState.fieldType === "date" ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Format d’affichage</Label>
                            <Input
                              value={guidedConfig.displayFormat ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  displayFormat: event.target.value,
                                }))
                              }
                              placeholder="ex: DD/MM/YYYY"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Date minimale</Label>
                            <Input
                              type="date"
                              value={guidedConfig.minDate ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  minDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Date maximale</Label>
                            <Input
                              type="date"
                              value={guidedConfig.maxDate ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  maxDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "select" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Options</Label>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox
                                id="allowMultiple"
                                checked={Boolean(guidedConfig.allowMultiple)}
                                onCheckedChange={(value) =>
                                  setGuidedConfig((previous) => ({
                                    ...previous,
                                    allowMultiple: Boolean(value),
                                  }))
                                }
                              />
                              <label htmlFor="allowMultiple">Sélection multiple</label>
                            </div>
                          </div>
                          <SelectOptionsEditor
                            options={(guidedConfig.options as SelectOptionState[]) ?? []}
                            onChange={(next) =>
                              setGuidedConfig((previous) => ({
                                ...previous,
                                options: next,
                              }))
                            }
                          />
                        </div>
                      ) : null}
                      {formState.fieldType === "boolean" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Libellé pour « vrai »</Label>
                            <Input
                              value={guidedConfig.trueLabel ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  trueLabel: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Libellé pour « faux »</Label>
                            <Input
                              value={guidedConfig.falseLabel ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  falseLabel: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "media" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Types autorisés</Label>
                            <Input
                              value={guidedConfig.allowedTypes ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  allowedTypes: event.target.value,
                                }))
                              }
                              placeholder="image/*, application/pdf"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Taille max (Mo)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={guidedConfig.maxSizeMb ?? ""}
                              onChange={(event) =>
                                setGuidedConfig((previous) => ({
                                  ...previous,
                                  maxSizeMb: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      <PreviewPanel title="Aperçu configuration" data={configPreview} />
                    </TabsContent>
                    <TabsContent value="advanced" className="space-y-3">
                      <Textarea
                        rows={6}
                        value={formState.configText}
                        onChange={(event) => {
                          const value = event.target.value
                          setFormState((previous) => ({ ...previous, configText: value }))
                          if (!value.trim()) {
                            setConfigJsonError(null)
                            return
                          }
                          try {
                            safeParseJSON(value)
                            setConfigJsonError(null)
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "JSON invalide"
                            setConfigJsonError(message)
                          }
                        }}
                        placeholder='{"minLength": 3, "maxLength": 80}'
                      />
                      {configJsonError ? (
                        <p className="text-sm text-destructive">{configJsonError}</p>
                      ) : (
                        <PreviewPanel title="Aperçu configuration" data={configPreview} />
                      )}
                    </TabsContent>
                  </Tabs>

                  <Tabs
                    value={validationsMode}
                    onValueChange={(value) => setValidationsMode(value as Mode)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Validations</span>
                        {validationsMode === "guided" ? (
                          <Badge variant="secondary">Assistant</Badge>
                        ) : (
                          <Badge variant="outline">JSON libre</Badge>
                        )}
                      </div>
                      <TabsList>
                        <TabsTrigger value="guided">Assistant</TabsTrigger>
                        <TabsTrigger value="advanced">JSON</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="guided" className="space-y-4">
                      {formState.fieldType === "text" || formState.fieldType === "multiline" ? (
                        <div className="space-y-1">
                          <Label>Pattern (RegExp)</Label>
                          <Input
                            value={guidedValidations.pattern ?? ""}
                            onChange={(event) =>
                              setGuidedValidations((previous) => ({
                                ...previous,
                                pattern: event.target.value,
                              }))
                            }
                            placeholder="Ex: ^[A-Za-z\\s]+$"
                          />
                          <p className="text-xs text-muted-foreground">
                            Utilisez une expression régulière JavaScript pour contraindre le format.
                          </p>
                        </div>
                      ) : null}
                      {formState.fieldType === "number" ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Minimum</Label>
                            <Input
                              type="number"
                              value={guidedValidations.min ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  min: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Maximum</Label>
                            <Input
                              type="number"
                              value={guidedValidations.max ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  max: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Pas</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={guidedValidations.step ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  step: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "date" ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Date minimale</Label>
                            <Input
                              type="date"
                              value={guidedValidations.minDate ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  minDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Date maximale</Label>
                            <Input
                              type="date"
                              value={guidedValidations.maxDate ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  maxDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Format attendu</Label>
                            <Input
                              value={guidedValidations.format ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  format: event.target.value,
                                }))
                              }
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "select" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Minimum sélectionné</Label>
                            <Input
                              type="number"
                              min={0}
                              value={guidedValidations.minSelections ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  minSelections: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Maximum sélectionné</Label>
                            <Input
                              type="number"
                              min={0}
                              value={guidedValidations.maxSelections ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  maxSelections: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      {formState.fieldType === "media" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Nombre de fichiers max</Label>
                            <Input
                              type="number"
                              min={1}
                              value={guidedValidations.maxFiles ?? ""}
                              onChange={(event) =>
                                setGuidedValidations((previous) => ({
                                  ...previous,
                                  maxFiles: event.target.value === "" ? "" : Number(event.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Autoriser les URLs externes</Label>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="allowExternal"
                                checked={Boolean(guidedValidations.allowExternal)}
                                onCheckedChange={(value) =>
                                  setGuidedValidations((previous) => ({
                                    ...previous,
                                    allowExternal: Boolean(value),
                                  }))
                                }
                              />
                              <label htmlFor="allowExternal" className="text-sm text-muted-foreground">
                                Permettre l’ajout via URL
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <PreviewPanel title="Aperçu validations" data={validationsPreview} />
                    </TabsContent>
                    <TabsContent value="advanced" className="space-y-3">
                      <Textarea
                        rows={6}
                        value={formState.validationsText}
                        onChange={(event) => {
                          const value = event.target.value
                          setFormState((previous) => ({ ...previous, validationsText: value }))
                          if (!value.trim()) {
                            setValidationsJsonError(null)
                            return
                          }
                          try {
                            safeParseJSON(value)
                            setValidationsJsonError(null)
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "JSON invalide"
                            setValidationsJsonError(message)
                          }
                        }}
                        placeholder='{"pattern": "^[A-Z]+$"}'
                      />
                      {validationsJsonError ? (
                        <p className="text-sm text-destructive">{validationsJsonError}</p>
                      ) : (
                        <PreviewPanel title="Aperçu validations" data={validationsPreview} />
                      )}
                    </TabsContent>
                  </Tabs>

                  {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Enregistrement..." : editingField ? "Mettre à jour" : "Créer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search">Recherche</Label>
              <Input
                id="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Rechercher par clé, libellé ou description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-visibility">Visibilité</Label>
              <Input
                id="filter-visibility"
                value={visibility}
                onChange={(event) => {
                  setVisibility(event.target.value)
                  setPage(1)
                }}
                placeholder="profile / template / cv"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={fieldTypeFilter}
                onValueChange={(value) => {
                  setFieldTypeFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr className="text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3">Clé</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Visibilité</th>
                  <th className="px-4 py-3">Obligatoire</th>
                  <th className="px-4 py-3">Mis à jour</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun champ trouvé.
                    </td>
                  </tr>
                ) : (
                  items.map((field) => (
                    <tr key={field.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{field.label}</div>
                        {field.description ? (
                          <div className="text-xs text-muted-foreground">{field.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{field.key}</td>
                      <td className="px-4 py-3 capitalize">{field.fieldType}</td>
                      <td className="px-4 py-3 text-muted-foreground">{field.visibility}</td>
                      <td className="px-4 py-3">
                        {field.isRequired ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                            Oui
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">Non</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(field.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(field)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteRequest(field)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              Page {data?.page ?? page} sur {totalPages} • {total} champ{total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le champ ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les valeurs déjà saisies et les bindings utilisant ce champ seront supprimés.
            </DialogDescription>
          </DialogHeader>
          {fieldPendingDeletion ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p>
                  Supprimer <strong>{fieldPendingDeletion.label}</strong> ({fieldPendingDeletion.key}) retire toutes les valeurs
                  associées sur les profils et peut invalider les templates qui y font référence.
                </p>
              </div>
              <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <FileWarning className="h-4 w-4" /> Pensez à exporter le schéma ou à dupliquer le champ avant suppression si
                  vous souhaitez pouvoir restaurer rapidement.
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4" /> Pour annuler, vous devrez recréer un champ avec la même clé et réappliquer les
                  bindings concernés.
                </p>
              </div>
            </div>
          ) : null}
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDeletion}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

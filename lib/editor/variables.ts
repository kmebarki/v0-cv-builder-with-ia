import { format } from "date-fns"
import type { AdminFieldDefinition } from "@/lib/editor/admin-fields"

// CV data variables that can be inserted into the editor
const BASE_VARIABLES = {
  personal: {
    label: "Informations personnelles",
    fields: {
      firstName: { label: "Prénom", path: "user.firstName" },
      lastName: { label: "Nom", path: "user.lastName" },
      email: { label: "Email", path: "user.email" },
      phone: { label: "Téléphone", path: "user.phone" },
      address: { label: "Adresse", path: "user.address" },
      city: { label: "Ville", path: "user.city" },
      postalCode: { label: "Code postal", path: "user.postalCode" },
      country: { label: "Pays", path: "user.country" },
      position: { label: "Titre professionnel", path: "user.currentPosition" },
      summary: { label: "Résumé", path: "user.professionalSummary" },
      avatar: { label: "Photo de profil", path: "user.avatarUrl" },
      linkedin: { label: "LinkedIn", path: "user.social.linkedin" },
      github: { label: "GitHub", path: "user.social.github" },
      website: { label: "Site web", path: "user.social.website" },
      portfolio: { label: "Portfolio", path: "user.social.portfolio" },
    },
  },
  experiences: {
    label: "Expériences",
    fields: {
      firstCompany: { label: "1ère entreprise", path: "experiences[0].company" },
      firstPosition: { label: "1er poste", path: "experiences[0].position" },
      firstStart: { label: "Date début", path: "experiences[0].startDate" },
      firstEnd: { label: "Date fin", path: "experiences[0].endDate" },
      firstDescription: { label: "Description", path: "experiences[0].description" },
      latestCompany: { label: "Entreprise la plus récente", path: "experiences[0].company" },
    },
  },
  education: {
    label: "Formations",
    fields: {
      firstSchool: { label: "Établissement", path: "education[0].institution" },
      firstDegree: { label: "Diplôme", path: "education[0].degree" },
      firstField: { label: "Domaine", path: "education[0].field" },
      firstStart: { label: "Début", path: "education[0].startDate" },
      firstEnd: { label: "Fin", path: "education[0].endDate" },
      firstDescription: { label: "Description", path: "education[0].description" },
    },
  },
  skills: {
    label: "Compétences",
    fields: {
      firstSkill: { label: "Compétence principale", path: "skills[0].name" },
      firstLevel: { label: "Niveau", path: "skills[0].level" },
      firstCategory: { label: "Catégorie", path: "skills[0].category" },
    },
  },
  languages: {
    label: "Langues",
    fields: {
      firstLanguage: { label: "Langue principale", path: "languages[0].name" },
      firstLanguageLevel: { label: "Niveau (langue principale)", path: "languages[0].level" },
      secondLanguage: { label: "Langue secondaire", path: "languages[1].name" },
      allLanguages: { label: "Toutes les langues", path: "languages" },
    },
  },
  interests: {
    label: "Centres d'intérêt",
    fields: {
      firstInterest: { label: "Centre d'intérêt principal", path: "interests[0]" },
      allInterests: { label: "Tous les centres d'intérêt", path: "interests" },
    },
  },
  metrics: {
    label: "Mesures & collections",
    fields: {
      experienceCount: { label: "Nombre d'expériences", path: "experiences.length" },
      educationCount: { label: "Nombre de formations", path: "education.length" },
      skillCount: { label: "Nombre de compétences", path: "skills.length" },
      languageCount: { label: "Nombre de langues", path: "languages.length" },
      experiences: { label: "Collection d'expériences", path: "experiences" },
      education: { label: "Collection de formations", path: "education" },
      skills: { label: "Collection de compétences", path: "skills" },
      languages: { label: "Collection de langues", path: "languages" },
      interests: { label: "Collection de centres d'intérêt", path: "interests" },
      skillGroups: { label: "Compétences groupées", path: "skillGroups" },
    },
  },
}

export type VariableRegistry = typeof BASE_VARIABLES & {
  admin?: {
    label: string
    fields: Record<string, { label: string; path: string; type?: string }>
  }
}

export function buildVariableRegistry(adminFields: AdminFieldDefinition[] = []): VariableRegistry {
  const registry: VariableRegistry = JSON.parse(JSON.stringify(BASE_VARIABLES))

  if (adminFields.length > 0) {
    registry.admin = {
      label: "Champs personnalisés",
      fields: adminFields.reduce<Record<string, { label: string; path: string; type?: string }>>((acc, field) => {
        acc[field.key] = {
          label: field.label,
          path: `admin.${field.key}`,
          type: field.fieldType,
        }
        return acc
      }, {}),
    }
  }

  return registry
}

// Functions that can be applied to variables
export const VARIABLE_FUNCTIONS = {
  uppercase: {
    label: "MAJUSCULES",
    apply: (value: string) => value?.toUpperCase() || "",
  },
  lowercase: {
    label: "minuscules",
    apply: (value: string) => value?.toLowerCase() || "",
  },
  capitalize: {
    label: "Capitaliser",
    apply: (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "",
  },
  trim: {
    label: "Supprimer espaces",
    apply: (value: string) => value?.trim() || "",
  },
  titleCase: {
    label: "Titre (Chaque mot)",
    apply: (value: string) =>
      value
        ?.toLowerCase()
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "",
  },
  dateFormat: {
    label: "Format Date (JJ/MM/AAAA)",
    apply: (value: string) => {
      try {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return format(date, "dd/MM/yyyy")
      } catch (error) {
        return value
      }
    },
  },
}

type ConditionalChecker = (value: any, compare: any, data?: any) => boolean

// Conditional operators
export const CONDITIONAL_OPERATORS: Record<
  string,
  { label: string; check: ConditionalChecker }
> = {
  exists: { label: "Existe", check: (value) => value !== null && value !== undefined && value !== "" },
  notExists: { label: "N'existe pas", check: (value) => value === null || value === undefined || value === "" },
  equals: { label: "Égal à", check: (value, compare) => value === compare },
  notEquals: { label: "Différent de", check: (value, compare) => value !== compare },
  contains: { label: "Contient", check: (value: string, search: string) => value?.toString().includes(search) },
  greaterThan: { label: "Supérieur à", check: (value, compare) => Number(value) > Number(compare) },
  lessThan: { label: "Inférieur à", check: (value, compare) => Number(value) < Number(compare) },
  jsonLogic: {
    label: "Expression JSONLogic",
    check: (_value, compare, data) => {
      if (!compare) return true
      try {
        const logic = typeof compare === "string" ? JSON.parse(compare) : compare
        return Boolean(evaluateJsonLogicExpression(logic, data ?? {}))
      } catch (error) {
        console.error("JSONLogic error", error)
        return false
      }
    },
  },
}

// Helper to resolve variable path from CV data
export function resolveVariable(data: any, path: string): any {
  if (!path) return undefined
  if (path === "length") {
    return Array.isArray(data) ? data.length : undefined
  }

  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".")
  let value = data

  for (const part of parts) {
    if (part === "") continue
    if (part === "length") {
      value = Array.isArray(value) ? value.length : undefined
      continue
    }
    if (Array.isArray(value)) {
      const index = Number(part)
      value = value[index]
    } else if (value && typeof value === "object") {
      value = value[part]
    } else {
      return undefined
    }
  }

  return value
}

// Helper to apply function to value
export function applyFunction(value: string, functionName: keyof typeof VARIABLE_FUNCTIONS): string {
  const func = VARIABLE_FUNCTIONS[functionName]
  return func ? func.apply(value) : value
}

// Helper to evaluate conditional
export function evaluateCondition(
  data: any,
  variablePath: string,
  operator: keyof typeof CONDITIONAL_OPERATORS,
  compareValue?: any,
): boolean {
  const condition = CONDITIONAL_OPERATORS[operator]
  if (!condition) return true

  const value = operator === "jsonLogic" ? undefined : resolveVariable(data, variablePath)
  return condition.check(value, compareValue, data)
}

export function renderTemplateExpression(template: string, data: any): string {
  if (!template || template.trim().length === 0) {
    return ""
  }

  return template.replace(/{{\s*([^}]+?)\s*}}/g, (_match, expression: string) => {
    const [rawPath, ...rawFunctions] = expression.split("|").map((part: string) => part.trim())

    if (!rawPath) {
      return ""
    }

    if ((rawPath.startsWith("\"") && rawPath.endsWith("\"")) || (rawPath.startsWith("'") && rawPath.endsWith("'"))) {
      const literal = rawPath.slice(1, -1)
      return literal
    }

    let value = resolveVariable(data, rawPath)
    if (value === undefined || value === null) {
      return ""
    }

    const functions = rawFunctions.filter(Boolean)
    if (functions.length > 0) {
      for (const func of functions) {
        if (func in VARIABLE_FUNCTIONS) {
          value = applyFunction(String(value), func as keyof typeof VARIABLE_FUNCTIONS)
        }
      }
    }

    if (Array.isArray(value)) {
      return value.join(", ")
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value)
      } catch (error) {
        console.error("Impossible de sérialiser la valeur", error)
        return ""
      }
    }

    return String(value)
  })
}

type JsonLogicExpression =
  | null
  | number
  | string
  | boolean
  | JsonLogicExpression[]
  | { [operator: string]: JsonLogicExpression | JsonLogicExpression[] }

function evaluateJsonLogicExpression(expression: JsonLogicExpression, data: any): any {
  if (expression === null || typeof expression === "boolean" || typeof expression === "number" || typeof expression === "string") {
    return expression
  }

  if (Array.isArray(expression)) {
    return expression.map((item) => evaluateJsonLogicExpression(item, data))
  }

  const [operator] = Object.keys(expression)
  const rawArgs = expression[operator]
  const args = Array.isArray(rawArgs)
    ? rawArgs.map((arg) => evaluateJsonLogicExpression(arg, data))
    : [evaluateJsonLogicExpression(rawArgs as JsonLogicExpression, data)]

  switch (operator) {
    case "var": {
      const path = Array.isArray(rawArgs) ? rawArgs[0] : rawArgs
      const fallback = Array.isArray(rawArgs) && rawArgs.length > 1 ? rawArgs[1] : undefined
      const value = typeof path === "string" ? resolveVariable(data, path) : undefined
      return value !== undefined ? value : fallback
    }
    case "and":
      return args.every(Boolean)
    case "or":
      return args.some(Boolean)
    case "!":
      return !args[0]
    case "==":
    case "===":
      return args[0] === args[1]
    case "!=":
    case "!==":
      return args[0] !== args[1]
    case ">":
      return Number(args[0]) > Number(args[1])
    case ">=":
      return Number(args[0]) >= Number(args[1])
    case "<":
      return Number(args[0]) < Number(args[1])
    case "<=":
      return Number(args[0]) <= Number(args[1])
    case "+":
      return args.reduce((acc, value) => acc + Number(value), 0)
    case "-":
      return args.slice(1).reduce((acc, value) => acc - Number(value), Number(args[0]))
    case "*":
      return args.reduce((acc, value) => acc * Number(value), 1)
    case "/":
      return args.slice(1).reduce((acc, value) => acc / Number(value || 1), Number(args[0] || 0))
    case "in":
      return Array.isArray(args[1]) ? args[1].includes(args[0]) : false
    case "max":
      return Math.max(...(args as number[]))
    case "min":
      return Math.min(...(args as number[]))
    default:
      console.warn(`Opérateur JSONLogic non supporté: ${operator}`)
      return false
  }
}

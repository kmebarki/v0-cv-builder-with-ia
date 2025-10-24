// CV data variables that can be inserted into the editor
export const CV_VARIABLES = {
  personal: {
    label: "Informations personnelles",
    fields: {
      firstName: { label: "Prénom", path: "users.first_name" },
      lastName: { label: "Nom", path: "users.last_name" },
      email: { label: "Email", path: "users.email" },
      phone: { label: "Téléphone", path: "users.phone" },
      address: { label: "Adresse", path: "users.address" },
      city: { label: "Ville", path: "users.city" },
      postalCode: { label: "Code postal", path: "users.postal_code" },
      country: { label: "Pays", path: "users.country" },
      title: { label: "Titre professionnel", path: "users.professional_title" },
      summary: { label: "Résumé", path: "users.summary" },
    },
  },
  experiences: {
    label: "Expériences",
    fields: {
      company: { label: "Entreprise", path: "experiences.company_name" },
      position: { label: "Poste", path: "experiences.position" },
      description: { label: "Description", path: "experiences.description" },
      startDate: { label: "Date de début", path: "experiences.start_date" },
      endDate: { label: "Date de fin", path: "experiences.end_date" },
      location: { label: "Lieu", path: "experiences.location" },
    },
  },
  education: {
    label: "Formation",
    fields: {
      institution: { label: "Établissement", path: "education.institution_name" },
      degree: { label: "Diplôme", path: "education.degree" },
      fieldOfStudy: { label: "Domaine", path: "education.field_of_study" },
      startDate: { label: "Date de début", path: "education.start_date" },
      endDate: { label: "Date de fin", path: "education.end_date" },
      description: { label: "Description", path: "education.description" },
    },
  },
  skills: {
    label: "Compétences",
    fields: {
      name: { label: "Nom", path: "skills.skill_name" },
      level: { label: "Niveau", path: "skills.proficiency_level" },
      category: { label: "Catégorie", path: "skills.category" },
    },
  },
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
    apply: (value: string) => value?.charAt(0).toUpperCase() + value?.slice(1).toLowerCase() || "",
  },
  trim: {
    label: "Supprimer espaces",
    apply: (value: string) => value?.trim() || "",
  },
}

// Conditional operators
export const CONDITIONAL_OPERATORS = {
  exists: { label: "Existe", check: (value: any) => value !== null && value !== undefined && value !== "" },
  notExists: { label: "N'existe pas", check: (value: any) => value === null || value === undefined || value === "" },
  equals: { label: "Égal à", check: (value: any, compare: any) => value === compare },
  notEquals: { label: "Différent de", check: (value: any, compare: any) => value !== compare },
  contains: { label: "Contient", check: (value: string, search: string) => value?.includes(search) },
}

// Helper to resolve variable path from CV data
export function resolveVariable(data: any, path: string): any {
  const parts = path.split(".")
  let value = data

  for (const part of parts) {
    if (value && typeof value === "object") {
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
  const value = resolveVariable(data, variablePath)
  const condition = CONDITIONAL_OPERATORS[operator]

  if (!condition) return true

  return condition.check(value, compareValue)
}

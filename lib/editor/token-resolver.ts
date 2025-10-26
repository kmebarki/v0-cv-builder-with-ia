import type { DesignTokenDefinition } from "@/lib/editor/design-tokens-store"

function getNestedValue(source: any, path: string[]) {
  return path.reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), source)
}

function resolveAlias(tokens: DesignTokenDefinition, ref: string) {
  const aliases = tokens.aliases ?? {}
  let current = ref
  const visited = new Set<string>()
  while (aliases[current] && !visited.has(current)) {
    visited.add(current)
    current = aliases[current]!
  }
  return current
}

export function resolveTokenReference(
  tokens: DesignTokenDefinition,
  theme: "light" | "dark",
  ref?: string,
): any {
  if (!ref) return undefined
  const trimmed = ref.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith("#") || trimmed.startsWith("rgb") || trimmed.startsWith("var")) {
    return trimmed
  }

  const normalized = resolveAlias(tokens, trimmed)

  if (normalized.startsWith("theme.")) {
    const [, ...rest] = normalized.split(".")
    const themeDefinition = tokens.themes?.[theme] ?? tokens.themes?.light
    return getNestedValue(themeDefinition, rest)
  }

  if (normalized.startsWith("themes.")) {
    const [, themeKey, ...rest] = normalized.split(".")
    const themeDefinition = tokens.themes?.[themeKey]
    return getNestedValue(themeDefinition, rest)
  }

  const [group, ...rest] = normalized.split(".")
  const modeOverride = tokens.modes?.[theme]
  const modeValue = getNestedValue(modeOverride?.[group], rest)
  if (modeValue !== undefined) {
    return modeValue
  }

  const baseGroup = (tokens as any)[group]
  if (rest.length === 0) {
    return baseGroup
  }
  const value = getNestedValue(baseGroup, rest)
  return value
}

import rawTokens from "@/lib/editor/design-tokens.json"
import { prisma } from "@/lib/prisma"

export interface DesignTokenTheme {
  name: string
  surface: string
  background: string
  text: string
  subtleText: string
  divider: string
}

export interface DesignTokenDefinition {
  colors: Record<string, string>
  fonts: Record<string, { family: string; weight: number; lineHeight: number }>
  fontSizes: Record<string, { size: number; lineHeight: number }>
  spacing: Record<string, number>
  radii: Record<string, number>
  shadows: Record<string, string>
  themes: Record<string, DesignTokenTheme>
  aliases?: Record<string, string>
  modes?: Record<string, Partial<DesignTokenDefinition>>
  version?: number
}

export function normalizeTokens(input: any): DesignTokenDefinition {
  const base: DesignTokenDefinition = {
    colors: input?.colors ?? {},
    fonts: input?.fonts ?? {},
    fontSizes: input?.fontSizes ?? {},
    spacing: input?.spacing ?? {},
    radii: input?.radii ?? {},
    shadows: input?.shadows ?? {},
    themes: input?.themes ?? {},
    aliases: input?.aliases ?? {},
    modes: input?.modes ?? {},
    version: typeof input?.version === "number" ? input.version : 1,
  }

  return base
}

export async function getDesignTokenSet() {
  const prismaAny = prisma as any
  const stored = await prismaAny.designTokenSet?.findFirst?.({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })

  if (!stored) {
    return {
      source: "fallback",
      tokens: normalizeTokens(rawTokens),
    }
  }

  const definition = normalizeTokens(stored.definition)

  return {
    source: "database" as const,
    id: stored.id as string,
    name: stored.name as string,
    version: stored.version as number,
    tokens: {
      ...definition,
      modes: stored.modes ?? definition.modes,
    },
  }
}

export type DesignTokenSetResult = Awaited<ReturnType<typeof getDesignTokenSet>>

export async function listDesignTokenSets() {
  const prismaAny = prisma as any
  const items = await prismaAny.designTokenSet?.findMany?.({
    orderBy: [{ isActive: "desc" }, { version: "desc" }],
  })

  return (items ?? []).map((item: any) => ({
    id: item.id as string,
    name: item.name as string,
    description: item.description as string | null,
    version: item.version as number,
    definition: normalizeTokens(item.definition),
    modes: item.modes ?? {},
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt as Date,
    updatedAt: item.updatedAt as Date,
  }))
}

import { redirect } from "next/navigation"
import { requireSession } from "@/lib/auth/session"
import { listDesignTokenSets, normalizeTokens } from "@/lib/editor/design-tokens-store"
import TokenSetAdmin from "@/components/admin/token-set-admin"
import rawTokens from "@/lib/editor/design-tokens.json"

export default async function TokenSetAdminPage() {
  const session = await requireSession()
  if (!session) {
    redirect("/auth/login")
  }

  const tokenSets = await listDesignTokenSets()
  const fallbackDefinition = normalizeTokens(rawTokens)

  const hydratedSets = tokenSets.length
    ? tokenSets
    : [
        {
          name: "Palette par défaut",
          description: "Import automatique des tokens de base",
          version: fallbackDefinition.version ?? 1,
          definition: fallbackDefinition,
          modes: fallbackDefinition.modes ?? {},
          isActive: true,
        },
      ]

  return (
    <div className="container mx-auto space-y-6 py-10">
      <TokenSetAdmin initialTokenSets={hydratedSets} fallbackDefinition={fallbackDefinition} />
    </div>
  )
}

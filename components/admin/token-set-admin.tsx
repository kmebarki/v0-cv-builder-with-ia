"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DesignTokenDefinition } from "@/lib/editor/design-tokens-store"

interface TokenSetRecord {
  id?: string
  name: string
  description?: string | null
  version: number
  definition: DesignTokenDefinition
  modes: Record<string, Partial<DesignTokenDefinition>>
  isActive: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}

interface TokenSetAdminProps {
  initialTokenSets: TokenSetRecord[]
  fallbackDefinition: DesignTokenDefinition
}

const EMPTY_DEFINITION: DesignTokenDefinition = {
  colors: {},
  fonts: {},
  fontSizes: {},
  spacing: {},
  radii: {},
  shadows: {},
  themes: {},
  aliases: {},
  modes: {},
  version: 1,
}

function cloneDefinition(def: DesignTokenDefinition): DesignTokenDefinition {
  return JSON.parse(JSON.stringify(def))
}

function cloneModes(modes: Record<string, Partial<DesignTokenDefinition>> | undefined) {
  return JSON.parse(JSON.stringify(modes ?? {})) as Record<string, Partial<DesignTokenDefinition>>
}

function sanitizeDefinition(definition: DesignTokenDefinition): DesignTokenDefinition {
  const clone = cloneDefinition(definition)
  delete (clone as any).modes
  return clone
}

function buildEmptyTokenSet(base?: DesignTokenDefinition): TokenSetRecord {
  const definition = sanitizeDefinition(base ?? EMPTY_DEFINITION)
  return {
    name: "Nouveau jeu de tokens",
    description: "",
    version: base?.version ?? 1,
    definition,
    modes: cloneModes(base?.modes),
    isActive: false,
  }
}

function ensureMode(definition: Record<string, Partial<DesignTokenDefinition>>, mode: string) {
  if (!definition[mode]) {
    definition[mode] = {}
  }
  return definition
}

function mergeMode(definition: DesignTokenDefinition, mode?: Partial<DesignTokenDefinition>) {
  if (!mode) return definition
  return {
    ...definition,
    colors: { ...definition.colors, ...(mode.colors ?? {}) },
    fonts: { ...definition.fonts, ...(mode.fonts ?? {}) },
    fontSizes: { ...definition.fontSizes, ...(mode.fontSizes ?? {}) },
    spacing: { ...definition.spacing, ...(mode.spacing ?? {}) },
    radii: { ...definition.radii, ...(mode.radii ?? {}) },
    shadows: { ...definition.shadows, ...(mode.shadows ?? {}) },
    themes: { ...definition.themes, ...(mode.themes ?? {}) },
    aliases: { ...definition.aliases, ...(mode.aliases ?? {}) },
  }
}

export function TokenSetAdmin({ initialTokenSets, fallbackDefinition }: TokenSetAdminProps) {
  const [tokenSets, setTokenSets] = useState<TokenSetRecord[]>(
    initialTokenSets.length > 0 ? initialTokenSets : [buildEmptyTokenSet(fallbackDefinition)],
  )
  const active = tokenSets.find((set) => set.isActive)
  const [selectedId, setSelectedId] = useState<string>(active?.id ?? tokenSets[0]?.id ?? "new")
  const [draft, setDraft] = useState<TokenSetRecord>(() => {
    const current = tokenSets.find((set) => set.id === selectedId)
    if (current) {
      return {
        ...current,
        definition: sanitizeDefinition(current.definition),
        modes: cloneModes(current.modes),
      }
    }
    return buildEmptyTokenSet(fallbackDefinition)
  })
  const [currentMode, setCurrentMode] = useState<string>("base")
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light")
  const [isSaving, setIsSaving] = useState(false)

  const availableModes = useMemo(() => Object.keys(draft.modes ?? {}), [draft.modes])

  const previewTokens = useMemo(() => {
    const base = draft.definition
    if (previewTheme && draft.modes?.[previewTheme]) {
      return mergeMode(base, draft.modes[previewTheme])
    }
    return base
  }, [draft.definition, draft.modes, previewTheme])

  function selectTokenSet(id: string) {
    if (id === "new") {
      setSelectedId("new")
      setDraft(buildEmptyTokenSet(fallbackDefinition))
      setCurrentMode("base")
      return
    }
    const next = tokenSets.find((set) => set.id === id)
    if (!next) return
    setSelectedId(id)
    setDraft({
      ...next,
      definition: cloneDefinition(next.definition),
      modes: cloneModes(next.modes),
    })
    setCurrentMode("base")
  }

  function updateBase<K extends keyof DesignTokenDefinition>(key: K, value: DesignTokenDefinition[K]) {
    setDraft((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        [key]: value,
      },
    }))
  }

  function updateMode<K extends keyof DesignTokenDefinition>(mode: string, key: K, value: DesignTokenDefinition[K]) {
    setDraft((prev) => {
      const nextModes = cloneModes(prev.modes)
      ensureMode(nextModes, mode)
      nextModes[mode] = {
        ...nextModes[mode],
        [key]: value,
      }
      return {
        ...prev,
        modes: nextModes,
      }
    })
  }

  function handleRecordChange(
    scope: "base" | string,
    group: keyof DesignTokenDefinition,
    key: string,
    value: any,
  ) {
    const target = scope === "base" ? draft.definition[group] : draft.modes?.[scope]?.[group]
    const nextRecord: Record<string, any> = {
      ...(target ?? {}),
      [key]: value,
    }
    if (scope === "base") {
      updateBase(group, nextRecord as any)
    } else {
      updateMode(scope, group, nextRecord as any)
    }
  }

  function handleRecordRename(
    scope: "base" | string,
    group: keyof DesignTokenDefinition,
    oldKey: string,
    newKey: string,
  ) {
    const target = scope === "base" ? draft.definition[group] : draft.modes?.[scope]?.[group]
    if (!target || oldKey === newKey) return
    const nextRecord: Record<string, any> = {}
    Object.entries(target as Record<string, any>).forEach(([key, value]) => {
      if (key === oldKey) {
        nextRecord[newKey] = value
      } else {
        nextRecord[key] = value
      }
    })
    if (scope === "base") {
      updateBase(group, nextRecord as any)
    } else {
      updateMode(scope, group, nextRecord as any)
    }
  }

  function handleRecordDelete(scope: "base" | string, group: keyof DesignTokenDefinition, key: string) {
    const target = scope === "base" ? draft.definition[group] : draft.modes?.[scope]?.[group]
    if (!target) return
    const nextRecord: Record<string, any> = {}
    Object.entries(target as Record<string, any>).forEach(([entryKey, value]) => {
      if (entryKey !== key) {
        nextRecord[entryKey] = value
      }
    })
    if (scope === "base") {
      updateBase(group, nextRecord as any)
    } else {
      updateMode(scope, group, nextRecord as any)
    }
  }

  function handleAddEntry(scope: "base" | string, group: keyof DesignTokenDefinition, prefix: string) {
    const target = scope === "base" ? draft.definition[group] : draft.modes?.[scope]?.[group]
    let index = 1
    let key = `${prefix}${index}`
    while (target && Object.prototype.hasOwnProperty.call(target, key)) {
      index += 1
      key = `${prefix}${index}`
    }
    const defaultValue = (() => {
      if (group === "colors") return "#000000"
      if (group === "fonts") return { family: "Inter", weight: 400, lineHeight: 1.4 }
      if (group === "fontSizes") return { size: 16, lineHeight: 1.4 }
      if (group === "spacing" || group === "radii") return 0
      if (group === "shadows") return "none"
      if (group === "aliases") return ""
      if (group === "themes") {
        return {
          name: "Nouveau thème",
          surface: "#ffffff",
          background: "#f4f4f5",
          text: "#0f172a",
          subtleText: "#475569",
          divider: "#e2e8f0",
        }
      }
      return ""
    })()
    handleRecordChange(scope, group, key, defaultValue)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      if (selectedId && selectedId !== "new" && draft.id) {
        const response = await fetch(`/api/tokensets/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            definition: sanitizeDefinition(draft.definition),
            modes: draft.modes,
          }),
        })
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const updated = (await response.json()) as TokenSetRecord
        setTokenSets((prev) => {
          const next = prev.map((set) => (set.id === updated.id ? { ...set, ...updated } : set))
          return next
        })
        selectTokenSet(updated.id!)
        toast.success("Jeu de tokens mis à jour")
      } else {
        const response = await fetch("/api/tokensets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            definition: sanitizeDefinition(draft.definition),
            modes: draft.modes,
            isActive: draft.isActive,
          }),
        })
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const created = (await response.json()) as TokenSetRecord
        setTokenSets((prev) => [{ ...created }, ...prev])
        selectTokenSet(created.id!)
        toast.success("Nouveau jeu de tokens créé")
      }
    } catch (error) {
      console.error(error)
      toast.error("Impossible d'enregistrer les tokens")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleActivate() {
    if (!draft.id) {
      toast.error("Enregistrez d'abord ce jeu de tokens")
      return
    }
    try {
      setIsSaving(true)
      const response = await fetch(`/api/tokensets/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const updated = (await response.json()) as TokenSetRecord
      setTokenSets((prev) =>
        prev.map((set) => ({
          ...set,
          isActive: set.id === updated.id ? true : false,
          ...(set.id === updated.id ? updated : {}),
        })),
      )
      selectTokenSet(updated.id!)
      toast.success("Jeu de tokens activé")
    } catch (error) {
      console.error(error)
      toast.error("Activation impossible")
    } finally {
      setIsSaving(false)
    }
  }

  function startClone() {
    setSelectedId("new")
    setDraft({
      ...buildEmptyTokenSet(),
      name: `${draft.name} (copie)` ?? "Nouvelle version",
      definition: sanitizeDefinition(draft.definition),
      modes: cloneModes(draft.modes),
    })
    setCurrentMode("base")
  }

  function renameMode(oldKey: string, newKey: string) {
    if (!oldKey || !newKey || oldKey === newKey) return
    setDraft((prev) => {
      const nextModes = cloneModes(prev.modes)
      if (!nextModes[oldKey] || nextModes[newKey]) return prev
      const payload = nextModes[oldKey]
      delete nextModes[oldKey]
      nextModes[newKey] = payload
      return {
        ...prev,
        modes: nextModes,
      }
    })
    setCurrentMode((value) => (value === oldKey ? newKey : value))
  }

  function removeMode(key: string) {
    setDraft((prev) => {
      const nextModes = cloneModes(prev.modes)
      if (!nextModes[key]) return prev
      delete nextModes[key]
      return {
        ...prev,
        modes: nextModes,
      }
    })
    setCurrentMode((value) => (value === key ? "base" : value))
  }

  const targetScope = currentMode === "base" ? "base" : currentMode

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Design tokens</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les palettes, la typographie, les espacements et les alias utilisés par l'éditeur.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Versions</CardTitle>
              <CardDescription>Sélectionnez ou dupliquez un jeu de tokens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tokenSets.map((set) => (
                <button
                  key={set.id ?? `draft-${set.version}`}
                  onClick={() => selectTokenSet(set.id ?? "new")}
                  className={`w-full rounded border p-3 text-left transition ${
                    selectedId === set.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{set.name}</span>
                    <span className="text-xs text-muted-foreground">v{set.version}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {set.description || "Aucune description"}
                  </p>
                  {set.isActive && (
                    <p className="mt-1 text-xs font-semibold text-primary">Actif</p>
                  )}
                </button>
              ))}
              <Button variant="outline" className="w-full" onClick={() => selectTokenSet("new")}>Nouveau jeu</Button>
              <Button variant="secondary" className="w-full" onClick={startClone}>
                Cloner en nouvelle version
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prévisualisation</CardTitle>
              <CardDescription>Basée sur le thème sélectionné.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Thème</Label>
                <Select value={previewTheme} onValueChange={(value) => setPreviewTheme(value as "light" | "dark")}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Thème" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                className="rounded border p-6"
                style={{
                  background: previewTokens.themes?.[previewTheme]?.surface ?? "#ffffff",
                  color: previewTokens.themes?.[previewTheme]?.text ?? "#111827",
                }}
              >
                <p className="text-sm font-medium" style={{ fontFamily: previewTokens.fonts?.heading?.family }}>
                  Exemple de typographie titre
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{
                    fontFamily: previewTokens.fonts?.body?.family,
                    lineHeight: previewTokens.fonts?.body?.lineHeight,
                  }}
                >
                  Le rendu applique automatiquement les couleurs, espacements et rayons liés aux tokens actifs.
                </p>
                <div
                  className="mt-4 inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
                  style={{
                    background: previewTokens.colors?.primary ?? "#2563eb",
                    color: previewTokens.colors?.onPrimary ?? "#ffffff",
                    borderRadius: `${previewTokens.radii?.md ?? 8}px`,
                  }}
                >
                  Bouton primaire
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-1 border-b bg-muted/40">
            <CardTitle>Édition du jeu de tokens</CardTitle>
            <CardDescription>
              {draft.id ? `Version ${draft.version}` : "Nouvelle version en préparation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="token-name">Nom</Label>
                <Input
                  id="token-name"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="token-version">Version</Label>
                <Input id="token-version" value={draft.version} readOnly disabled />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="token-description">Description</Label>
                <Textarea
                  id="token-description"
                  value={draft.description ?? ""}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <Tabs value={currentMode} onValueChange={setCurrentMode} className="w-full">
              <TabsList>
                <TabsTrigger value="base">Base</TabsTrigger>
                {availableModes.map((mode) => (
                  <TabsTrigger key={mode} value={mode}>
                    Mode {mode}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="aliases">Alias</TabsTrigger>
              </TabsList>

              <TabsContent value="base" className="space-y-6">
                <TokenGroupEditor
                  scope={targetScope}
                  group="colors"
                  title="Couleurs"
                  records={draft.definition.colors}
                  onChange={handleRecordChange}
                  onRename={handleRecordRename}
                  onDelete={handleRecordDelete}
                  onAdd={handleAddEntry}
                  inputType="color"
                />

                <FontGroupEditor
                  title="Typographies"
                  records={draft.definition.fonts}
                  onChange={(key, value) => handleRecordChange("base", "fonts", key, value)}
                  onRename={(oldKey, newKey) => handleRecordRename("base", "fonts", oldKey, newKey)}
                  onDelete={(key) => handleRecordDelete("base", "fonts", key)}
                  onAdd={() => handleAddEntry("base", "fonts", "font")}
                />

                <FontSizeGroupEditor
                  title="Tailles de police"
                  records={draft.definition.fontSizes}
                  onChange={(key, value) => handleRecordChange("base", "fontSizes", key, value)}
                  onRename={(oldKey, newKey) => handleRecordRename("base", "fontSizes", oldKey, newKey)}
                  onDelete={(key) => handleRecordDelete("base", "fontSizes", key)}
                  onAdd={() => handleAddEntry("base", "fontSizes", "size")}
                />

                <TokenGroupEditor
                  scope="base"
                  group="spacing"
                  title="Espacements"
                  records={draft.definition.spacing}
                  onChange={handleRecordChange}
                  onRename={handleRecordRename}
                  onDelete={handleRecordDelete}
                  onAdd={handleAddEntry}
                  inputType="number"
                />

                <TokenGroupEditor
                  scope="base"
                  group="radii"
                  title="Rayons"
                  records={draft.definition.radii}
                  onChange={handleRecordChange}
                  onRename={handleRecordRename}
                  onDelete={handleRecordDelete}
                  onAdd={handleAddEntry}
                  inputType="number"
                />

                <TokenGroupEditor
                  scope="base"
                  group="shadows"
                  title="Ombres"
                  records={draft.definition.shadows}
                  onChange={handleRecordChange}
                  onRename={handleRecordRename}
                  onDelete={handleRecordDelete}
                  onAdd={handleAddEntry}
                />

                <ThemeGroupEditor
                  scope="base"
                  title="Thèmes"
                  records={draft.definition.themes}
                  onChange={(key, value) => handleRecordChange("base", "themes", key, value)}
                  onRename={(oldKey, newKey) => handleRecordRename("base", "themes", oldKey, newKey)}
                  onDelete={(key) => handleRecordDelete("base", "themes", key)}
                  onAdd={() => handleAddEntry("base", "themes", "theme")}
                />
              </TabsContent>

              {availableModes.map((mode) => (
                <TabsContent key={mode} value={mode} className="space-y-6">
                  <TokenGroupEditor
                    scope={mode}
                    group="colors"
                    title={`Couleurs (${mode})`}
                    records={(draft.modes?.[mode]?.colors as Record<string, string>) ?? {}}
                    onChange={handleRecordChange}
                    onRename={handleRecordRename}
                    onDelete={handleRecordDelete}
                    onAdd={handleAddEntry}
                    inputType="color"
                  />

                  <FontGroupEditor
                    title={`Typographies (${mode})`}
                    records={(draft.modes?.[mode]?.fonts as Record<string, any>) ?? {}}
                    onChange={(key, value) => handleRecordChange(mode, "fonts", key, value)}
                    onRename={(oldKey, newKey) => handleRecordRename(mode, "fonts", oldKey, newKey)}
                    onDelete={(key) => handleRecordDelete(mode, "fonts", key)}
                    onAdd={() => handleAddEntry(mode, "fonts", "font")}
                  />

                  <FontSizeGroupEditor
                    title={`Tailles (${mode})`}
                    records={(draft.modes?.[mode]?.fontSizes as Record<string, any>) ?? {}}
                    onChange={(key, value) => handleRecordChange(mode, "fontSizes", key, value)}
                    onRename={(oldKey, newKey) => handleRecordRename(mode, "fontSizes", oldKey, newKey)}
                    onDelete={(key) => handleRecordDelete(mode, "fontSizes", key)}
                    onAdd={() => handleAddEntry(mode, "fontSizes", "size")}
                  />

                  <TokenGroupEditor
                    scope={mode}
                    group="spacing"
                    title={`Espacements (${mode})`}
                    records={(draft.modes?.[mode]?.spacing as Record<string, number>) ?? {}}
                    onChange={handleRecordChange}
                    onRename={handleRecordRename}
                    onDelete={handleRecordDelete}
                    onAdd={handleAddEntry}
                    inputType="number"
                  />

                  <TokenGroupEditor
                    scope={mode}
                    group="radii"
                    title={`Rayons (${mode})`}
                    records={(draft.modes?.[mode]?.radii as Record<string, number>) ?? {}}
                    onChange={handleRecordChange}
                    onRename={handleRecordRename}
                    onDelete={handleRecordDelete}
                    onAdd={handleAddEntry}
                    inputType="number"
                  />

                  <TokenGroupEditor
                    scope={mode}
                    group="shadows"
                    title={`Ombres (${mode})`}
                    records={(draft.modes?.[mode]?.shadows as Record<string, string>) ?? {}}
                    onChange={handleRecordChange}
                    onRename={handleRecordRename}
                    onDelete={handleRecordDelete}
                    onAdd={handleAddEntry}
                  />

                  <ThemeGroupEditor
                    scope={mode}
                    title={`Thèmes (${mode})`}
                    records={(draft.modes?.[mode]?.themes as Record<string, any>) ?? {}}
                    onChange={(key, value) => handleRecordChange(mode, "themes", key, value)}
                    onRename={(oldKey, newKey) => handleRecordRename(mode, "themes", oldKey, newKey)}
                    onDelete={(key) => handleRecordDelete(mode, "themes", key)}
                    onAdd={() => handleAddEntry(mode, "themes", "theme")}
                  />
                </TabsContent>
              ))}

              <TabsContent value="aliases" className="space-y-6">
                <TokenGroupEditor
                  scope="base"
                  group="aliases"
                  title="Alias"
                  records={draft.definition.aliases ?? {}}
                  onChange={handleRecordChange}
                  onRename={handleRecordRename}
                  onDelete={handleRecordDelete}
                  onAdd={handleAddEntry}
                />
                <div className="space-y-3 rounded border p-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Modes personnalisés
                  </h3>
                  {availableModes.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun mode défini</p>
                  )}
                  <div className="space-y-3">
                    {availableModes.map((mode) => (
                      <div key={mode} className="flex flex-col gap-2 rounded border p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Input
                            defaultValue={mode}
                            onBlur={(event) => {
                              const next = event.target.value.trim()
                              if (next && next !== mode) {
                                renameMode(mode, next)
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentMode(mode)}>
                              Éditer
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeMode(mode)}>
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span>Ajouter un nouveau mode</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setDraft((prev) => {
                        const nextModes = cloneModes(prev.modes)
                        let index = availableModes.length + 1
                        let modeKey = `mode-${index}`
                        while (nextModes[modeKey]) {
                          index += 1
                          modeKey = `mode-${index}`
                        }
                        nextModes[modeKey] = {}
                        return {
                          ...prev,
                          modes: nextModes,
                        }
                      })
                    }
                  >
                    Nouveau mode
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {selectedId === "new" ? "Créer" : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={handleActivate} disabled={isSaving || !draft.id}>
                Activer ce jeu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface TokenGroupEditorProps {
  scope: "base" | string
  group: keyof DesignTokenDefinition
  title: string
  records: Record<string, string | number>
  onChange: (
    scope: "base" | string,
    group: keyof DesignTokenDefinition,
    key: string,
    value: any,
  ) => void
  onRename: (
    scope: "base" | string,
    group: keyof DesignTokenDefinition,
    oldKey: string,
    newKey: string,
  ) => void
  onDelete: (scope: "base" | string, group: keyof DesignTokenDefinition, key: string) => void
  onAdd: (scope: "base" | string, group: keyof DesignTokenDefinition, prefix: string) => void
  inputType?: "color" | "number" | "text"
}

function TokenGroupEditor({
  scope,
  group,
  title,
  records,
  onChange,
  onRename,
  onDelete,
  onAdd,
  inputType = "text",
}: TokenGroupEditorProps) {
  const entries = Object.entries(records ?? {})

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={() => onAdd(scope, group, `${group}-`)}>
          Ajouter
        </Button>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Aucun élément</p>}
        {entries.map(([key, value]) => (
          <div key={key} className="grid gap-2 rounded border p-3 md:grid-cols-[160px_1fr_auto]">
            <Input
              value={key}
              onChange={(event) => onRename(scope, group, key, event.target.value)}
              placeholder="Identifiant"
            />
            <div className="flex items-center gap-2">
              {inputType === "color" && (
                <Input
                  type="color"
                  value={typeof value === "string" ? value : "#000000"}
                  onChange={(event) => onChange(scope, group, key, event.target.value)}
                  className="h-10 w-16 p-1"
                />
              )}
              <Input
                type={inputType === "number" ? "number" : "text"}
                value={value ?? ""}
                onChange={(event) =>
                  onChange(
                    scope,
                    group,
                    key,
                    inputType === "number" ? Number(event.target.value) : event.target.value,
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(scope, group, key)}
              className="justify-self-end"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FontGroupEditorProps {
  title: string
  records: Record<string, { family: string; weight: number; lineHeight: number }>
  onChange: (key: string, value: { family: string; weight: number; lineHeight: number }) => void
  onRename: (oldKey: string, newKey: string) => void
  onDelete: (key: string) => void
  onAdd: () => void
}

function FontGroupEditor({ title, records, onChange, onRename, onDelete, onAdd }: FontGroupEditorProps) {
  const entries = Object.entries(records ?? {})
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          Ajouter
        </Button>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Aucune police définie</p>}
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-2 rounded border p-3">
            <Input value={key} onChange={(event) => onRename(key, event.target.value)} />
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>Famille</Label>
                <Input value={value.family} onChange={(event) => onChange(key, { ...value, family: event.target.value })} />
              </div>
              <div>
                <Label>Graisse</Label>
                <Input
                  type="number"
                  value={value.weight}
                  onChange={(event) => onChange(key, { ...value, weight: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label>Interligne</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={value.lineHeight}
                  onChange={(event) => onChange(key, { ...value, lineHeight: Number(event.target.value) })}
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDelete(key)}>
              Supprimer
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FontSizeGroupEditorProps {
  title: string
  records: Record<string, { size: number; lineHeight: number }>
  onChange: (key: string, value: { size: number; lineHeight: number }) => void
  onRename: (oldKey: string, newKey: string) => void
  onDelete: (key: string) => void
  onAdd: () => void
}

function FontSizeGroupEditor({ title, records, onChange, onRename, onDelete, onAdd }: FontSizeGroupEditorProps) {
  const entries = Object.entries(records ?? {})
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          Ajouter
        </Button>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Aucune taille définie</p>}
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-2 rounded border p-3">
            <Input value={key} onChange={(event) => onRename(key, event.target.value)} />
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Taille (px)</Label>
                <Input
                  type="number"
                  value={value.size}
                  onChange={(event) => onChange(key, { ...value, size: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label>Interligne</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={value.lineHeight}
                  onChange={(event) => onChange(key, { ...value, lineHeight: Number(event.target.value) })}
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDelete(key)}>
              Supprimer
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ThemeGroupEditorProps {
  scope: "base" | string
  title: string
  records: Record<string, { name: string; surface: string; background: string; text: string; subtleText: string; divider: string }>
  onChange: (key: string, value: {
    name: string
    surface: string
    background: string
    text: string
    subtleText: string
    divider: string
  }) => void
  onRename: (oldKey: string, newKey: string) => void
  onDelete: (key: string) => void
  onAdd: () => void
}

function ThemeGroupEditor({ scope, title, records, onChange, onRename, onDelete, onAdd }: ThemeGroupEditorProps) {
  const entries = Object.entries(records ?? {})
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          Ajouter
        </Button>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Aucun thème configuré</p>}
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-2 rounded border p-3">
            <Input value={key} onChange={(event) => onRename(key, event.target.value)} />
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Nom</Label>
                <Input value={value.name} onChange={(event) => onChange(key, { ...value, name: event.target.value })} />
              </div>
              <div>
                <Label>Surface</Label>
                <Input
                  type="color"
                  value={value.surface}
                  onChange={(event) => onChange(key, { ...value, surface: event.target.value })}
                />
              </div>
              <div>
                <Label>Fond</Label>
                <Input
                  type="color"
                  value={value.background}
                  onChange={(event) => onChange(key, { ...value, background: event.target.value })}
                />
              </div>
              <div>
                <Label>Texte</Label>
                <Input
                  type="color"
                  value={value.text}
                  onChange={(event) => onChange(key, { ...value, text: event.target.value })}
                />
              </div>
              <div>
                <Label>Texte secondaire</Label>
                <Input
                  type="color"
                  value={value.subtleText}
                  onChange={(event) => onChange(key, { ...value, subtleText: event.target.value })}
                />
              </div>
              <div>
                <Label>Diviseur</Label>
                <Input
                  type="color"
                  value={value.divider}
                  onChange={(event) => onChange(key, { ...value, divider: event.target.value })}
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDelete(key)}>
              Supprimer
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TokenSetAdmin

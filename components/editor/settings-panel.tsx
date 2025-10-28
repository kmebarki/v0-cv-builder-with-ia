"use client"

import { useMemo, useState } from "react"
import { useEditor, useNode } from "@craftjs/core"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AIFieldAssistant } from "@/components/ai/ai-field-assistant"
import type { AIAssistantContext } from "@/components/ai/ai-assistant-dialog"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { TokenRefPicker } from "@/components/editor/token-ref-picker"
import { VARIABLE_FUNCTIONS, CONDITIONAL_OPERATORS, resolveVariable } from "@/lib/editor/variables"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { toast } from "sonner"
import { useVariableRegistry } from "@/components/editor/use-variable-registry"

export function SettingsPanel() {
  const [panelTab, setPanelTab] = useState("properties")
  const { selected } = useEditor((state) => ({
    selected: state.events.selected,
  }))

  const selectedId = selected && selected.length > 0 ? selected[selected.length - 1] : undefined

  return (
    <Tabs value={panelTab} onValueChange={setPanelTab} className="flex h-full flex-col">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="properties">Propriétés</TabsTrigger>
        <TabsTrigger value="json">Structure JSON</TabsTrigger>
        <TabsTrigger value="tokens">Tokens</TabsTrigger>
      </TabsList>

      <TabsContent value="properties" className="flex-1 overflow-y-auto px-1 pt-4">
        {selectedId ? (
          <NodeSettings key={selectedId} />
        ) : (
          <div className="px-2 text-center text-sm text-muted-foreground">
            Sélectionnez un élément pour modifier ses propriétés
          </div>
        )}
      </TabsContent>

      <TabsContent value="json" className="flex-1 overflow-y-auto px-1 pt-4">
        <TemplateStructureTab />
      </TabsContent>

      <TabsContent value="tokens" className="flex-1 overflow-y-auto px-1 pt-4">
        <TokenExplorerTab selectedNodeId={selectedId} />
      </TabsContent>
    </Tabs>
  )
}

function TemplateStructureTab() {
  const { serialized } = useEditor((state, query) => ({
    serialized: query.serialize(),
  }))
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serialized)
      setCopied(true)
      toast.success("Structure JSON copiée")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Impossible de copier le JSON")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Structure brute</h3>
          <p className="text-xs text-muted-foreground">
            Vue en lecture seule du template courant. Copiez ou exportez pour inspection.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
      <Textarea value={serialized} readOnly rows={16} className="h-full font-mono text-xs" />
    </div>
  )
}

interface TokenExplorerTabProps {
  selectedNodeId?: string
}

function TokenExplorerTab({ selectedNodeId }: TokenExplorerTabProps) {
  const { tokens, theme, setTheme } = useTemplateEditor()
  const { actions } = useEditor()
  const [colorTarget, setColorTarget] = useState("color")
  const [spacingTarget, setSpacingTarget] = useState("padding")

  const colorTokens = useMemo(() => Object.entries(tokens.colors), [tokens.colors])
  const spacingTokens = useMemo(() => Object.entries(tokens.spacing), [tokens.spacing])
  const radiusTokens = useMemo(() => Object.entries(tokens.radii), [tokens.radii])
  const shadowTokens = useMemo(() => Object.entries(tokens.shadows), [tokens.shadows])
  const fontTokens = useMemo(() => Object.entries(tokens.fonts), [tokens.fonts])
  const fontSizeTokens = useMemo(() => Object.entries(tokens.fontSizes), [tokens.fontSizes])
  const themeTokens = useMemo(() => Object.entries(tokens.themes), [tokens.themes])

  const ensureSelection = () => {
    if (!selectedNodeId) {
      toast.error("Sélectionnez un bloc avant d'appliquer un token")
      return false
    }
    return true
  }

  const applyColor = (value: string) => {
    if (!ensureSelection()) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft[colorTarget] = value
    })
    toast.success(`Token couleur appliqué sur ${colorTarget}`)
  }

  const applySpacing = (value: number) => {
    if (!ensureSelection()) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft[spacingTarget] = value
    })
    toast.success(`Token d'espacement appliqué sur ${spacingTarget}`)
  }

  const applyRadius = (value: number) => {
    if (!ensureSelection()) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft.borderRadius = value
    })
    toast.success("Token de rayon appliqué")
  }

  const applyShadow = (value: string) => {
    if (!ensureSelection()) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft.boxShadow = value
    })
    toast.success("Ombre appliquée")
  }

  const applyFont = (key: string) => {
    if (!ensureSelection()) return
    const token = tokens.fonts[key]
    if (!token) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft.fontFamily = token.family
      if (token.weight) {
        draft.fontWeight = token.weight
      }
      if (token.lineHeight) {
        draft.lineHeight = token.lineHeight
      }
    })
    toast.success("Typographie appliquée")
  }

  const applyFontSize = (key: string) => {
    if (!ensureSelection()) return
    const token = tokens.fontSizes[key]
    if (!token) return
    actions.setProp(selectedNodeId!, (draft: any) => {
      draft.fontSize = token.size
      draft.lineHeight = token.lineHeight
    })
    toast.success("Corps de texte appliqué")
  }

  const copyValue = async (value: string | number) => {
    try {
      await navigator.clipboard.writeText(String(value))
      toast.success("Token copié dans le presse-papier")
    } catch (error) {
      toast.error("Impossible de copier la valeur")
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Thèmes</h3>
            <p className="text-xs text-muted-foreground">Alternez instantanément entre les palettes administrateur.</p>
          </div>
        </div>
        <div className="grid gap-2">
          {themeTokens.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{value.name}</p>
                <p className="text-xs text-muted-foreground">Fond {value.background} • Surface {value.surface}</p>
              </div>
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                variant={theme === key ? "default" : "outline"}
                onClick={() => setTheme(key as "light" | "dark")}
              >
                {theme === key ? "Actif" : "Activer"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Couleurs</h3>
            <p className="text-xs text-muted-foreground">Appliquez directement des couleurs normalisées.</p>
          </div>
          <Select value={colorTarget} onValueChange={setColorTarget}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Propriété" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="color">Texte</SelectItem>
              <SelectItem value="background">Arrière-plan</SelectItem>
              <SelectItem value="backgroundColor">Arrière-plan (alt)</SelectItem>
              <SelectItem value="borderColor">Bordure</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          {colorTokens.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 rounded" style={{ backgroundColor: value }} />
                <div>
                  <p className="text-sm font-medium">{key}</p>
                  <p className="text-xs text-muted-foreground">{value}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-xs" variant="outline" onClick={() => copyValue(value)}>
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applyColor(value)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Typographies</h3>
            <p className="text-xs text-muted-foreground">Police, graisse et interlignage synchronisés.</p>
          </div>
        </div>
        <div className="grid gap-2">
          {fontTokens.map(([key, token]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{key}</p>
                <p className="text-xs text-muted-foreground">
                  {token.family} • {token.weight} • lh {token.lineHeight}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  variant="outline"
                  onClick={() => copyValue(`${token.family}|${token.weight}`)}
                >
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applyFont(key)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Corps de texte</h3>
          <p className="text-xs text-muted-foreground">Appliquez les tailles & interlignages du design system.</p>
        </div>
        <div className="grid gap-2">
          {fontSizeTokens.map(([key, token]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{key}</p>
                <p className="text-xs text-muted-foreground">
                  {token.size}px • lh {token.lineHeight}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-xs" variant="outline" onClick={() => copyValue(token.size)}>
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applyFontSize(key)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Espacements</h3>
            <p className="text-xs text-muted-foreground">Gérez padding, margin ou gap depuis les tokens.</p>
          </div>
          <Select value={spacingTarget} onValueChange={setSpacingTarget}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Propriété" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="padding">Padding</SelectItem>
              <SelectItem value="margin">Margin</SelectItem>
              <SelectItem value="gap">Gap</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          {spacingTokens.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{key}</p>
                <p className="text-xs text-muted-foreground">{value}px</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-xs" variant="outline" onClick={() => copyValue(value)}>
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applySpacing(value)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Rayons</h3>
          <p className="text-xs text-muted-foreground">Uniformisez les arrondis selon le design system.</p>
        </div>
        <div className="grid gap-2">
          {radiusTokens.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{key}</p>
                <p className="text-xs text-muted-foreground">{value}px</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-xs" variant="outline" onClick={() => copyValue(value)}>
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applyRadius(value)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Ombres</h3>
          <p className="text-xs text-muted-foreground">Appliquez rapidement les presets d'ombres.</p>
        </div>
        <div className="grid gap-2">
          {shadowTokens.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/60 p-2">
              <div>
                <p className="text-sm font-medium">{key}</p>
                <p className="text-xs text-muted-foreground">{value}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-xs" variant="outline" onClick={() => copyValue(value)}>
                  Copier
                </Button>
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => applyShadow(value)}>
                  Appliquer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function NodeSettings() {
  const { tokens, cvData } = useTemplateEditor()
  const variableRegistry = useVariableRegistry()
  const {
    actions: { setProp },
    props,
    name,
  } = useNode((node) => ({
    props: node.data.props,
    name: node.data.displayName || node.data.name,
  }))

  const [activeTab, setActiveTab] = useState("content")

  const isTextNode = name === "Text" || name === "TextNode"
  const isVariableText = name === "Variable Text" || name === "VariableTextNode"
  const isRichText = name === "Rich Text" || name === "RichTextNode"
  const isContainer = name === "Container"
  const isSection = name === "Section"
  const isStack = name === "Stack"
  const isGrid = name === "Grid"
  const isImage = name === "Image" || name === "ImageNode"
  const isBadge = name === "Badge"
  const isRating = name === "Rating"
  const isShape = name === "Shape"
  const isPage = name === "Page"
  const isRepeat = name === "Repeat"

  const repeatCollections = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const metrics = variableRegistry.metrics?.fields ?? {}
    for (const field of Object.values(metrics)) {
      if (!field.path) continue
      const value = resolveVariable(cvData, field.path)
      if (Array.isArray(value) || (value && typeof value === "object")) {
        const count = Array.isArray(value) ? value.length : Object.keys(value || {}).length
        const suffix = count > 0 ? ` (${count})` : ""
        options.push({ value: field.path, label: `${field.label}${suffix}` })
      }
    }
    if (props.collectionPath && !options.some((option) => option.value === props.collectionPath)) {
      options.push({ value: props.collectionPath, label: props.collectionPath })
    }
    return options
  }, [cvData, props.collectionPath, variableRegistry])

  const renderContentTab = () => {
    if (isRepeat) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Collection</Label>
            <Select
              value={props.collectionPath || ""}
              onValueChange={(value) => setProp((draft: any) => (draft.collectionPath = value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une collection" />
              </SelectTrigger>
              <SelectContent>
                {repeatCollections.length === 0 && <SelectItem value="" disabled>Aucune collection disponible</SelectItem>}
                {repeatCollections.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alias de l'élément</Label>
            <Input
              value={props.itemAlias || ""}
              onChange={(event) => setProp((draft: any) => (draft.itemAlias = event.target.value))}
              placeholder="ex: experience, skill"
            />
          </div>

          <div className="space-y-2">
            <Label>Alias de l'index</Label>
            <Input
              value={props.indexAlias || ""}
              onChange={(event) => setProp((draft: any) => (draft.indexAlias = event.target.value))}
              placeholder="ex: experienceIndex"
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre maximum d'éléments</Label>
            <Input
              type="number"
              min={0}
              value={props.maxItems ?? ""}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10)
                setProp((draft: any) => (draft.maxItems = Number.isFinite(value) ? value : undefined))
              }}
              placeholder="Laisser vide pour tout afficher"
            />
          </div>

          <div className="space-y-2">
            <Label>Texte si vide</Label>
            <Input
              value={props.emptyFallback || ""}
              onChange={(event) => setProp((draft: any) => (draft.emptyFallback = event.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Preset d'affichage</Label>
            <Select
              value={props.layoutPreset || "list"}
              onValueChange={(value) => setProp((draft: any) => (draft.layoutPreset = value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">Liste simple</SelectItem>
                <SelectItem value="card">Cartes</SelectItem>
                <SelectItem value="timeline">Frise chronologique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Padding interne</Label>
              <Input
                type="number"
                min={0}
                value={props.itemPadding ?? 0}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  setProp((draft: any) => (draft.itemPadding = Number.isFinite(value) ? value : 0))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur de fond</Label>
              <Input
                type="color"
                value={props.itemBackground || "#FFFFFF"}
                onChange={(event) => setProp((draft: any) => (draft.itemBackground = event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur de bordure</Label>
              <Input
                type="color"
                value={props.itemBorderColor || "#E2E8F0"}
                onChange={(event) => setProp((draft: any) => (draft.itemBorderColor = event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Épaisseur de bordure</Label>
              <Input
                type="number"
                min={0}
                value={props.itemBorderWidth ?? 1}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  setProp((draft: any) => (draft.itemBorderWidth = Number.isFinite(value) ? value : 1))
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="repeat-alternate"
              checked={Boolean(props.alternateBackground)}
              onCheckedChange={(value) => setProp((draft: any) => (draft.alternateBackground = Boolean(value)))}
            />
            <Label htmlFor="repeat-alternate" className="text-sm font-normal">
              Alterner la couleur de fond sur un élément sur deux
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="repeat-divider"
              checked={Boolean(props.showDivider)}
              onCheckedChange={(value) => setProp((draft: any) => (draft.showDivider = Boolean(value)))}
            />
            <Label htmlFor="repeat-divider" className="text-sm font-normal">
              Afficher un séparateur entre les éléments
            </Label>
          </div>

          {props.showDivider && (
            <div className="space-y-2">
              <Label>Couleur du séparateur</Label>
              <Input
                type="color"
                value={props.dividerColor || "#CBD5F5"}
                onChange={(event) => setProp((draft: any) => (draft.dividerColor = event.target.value))}
              />
            </div>
          )}
        </div>
      )
    }

    if (isVariableText) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mode de contenu</Label>
            <Select
              value={(props.mode as string) || "single"}
              onValueChange={(value) => setProp((draft: any) => (draft.mode = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Valeur unique</SelectItem>
                <SelectItem value="template">Expression / concaténation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {props.mode !== "template" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Variable</Label>
                <Select
                  value={props.variablePath || ""}
                  onValueChange={(value) => setProp((draft: any) => (draft.variablePath = value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(variableRegistry).map(([categoryKey, category]) => (
                      <div key={categoryKey}>
                        <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                          {category.label}
                        </div>
                        {Object.entries(category.fields).map(([fieldKey, field]) => (
                          <SelectItem key={fieldKey} value={field.path}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fonctions</Label>
                <div className="flex flex-wrap gap-2">
                  {(props.functions || []).map((func: string) => (
                    <Badge key={func} variant="secondary">
                      {VARIABLE_FUNCTIONS[func as keyof typeof VARIABLE_FUNCTIONS]?.label || func}
                      <button
                        onClick={() =>
                          setProp(
                            (draft: any) =>
                              (draft.functions = (draft.functions || []).filter((entry: string) => entry !== func)),
                          )
                        }
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value=""
                  onValueChange={(value) =>
                    setProp((draft: any) => (draft.functions = [...(draft.functions || []), value]))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ajouter une fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VARIABLE_FUNCTIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {props.mode === "template" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Expression</Label>
                <Textarea
                  value={props.template || ""}
                  rows={4}
                  onChange={(event) => setProp((draft: any) => (draft.template = event.target.value))}
                  placeholder="Ex: {{ user.lastName | uppercase }} {{ user.firstName | capitalize }}"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez la syntaxe <code>{"{{ variable | fonction }}"}</code> pour concaténer plusieurs champs et appliquer des filtres.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Insérer une variable</Label>
                <Select
                  value=""
                  onValueChange={(value) =>
                    setProp((draft: any) => {
                      const insertion = `{{ ${value} }}`
                      const current = draft.template || ""
                      draft.template = current
                        ? `${current}${current.endsWith(" ") ? "" : " "}${insertion}`
                        : insertion
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une variable à insérer" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(variableRegistry).map(([categoryKey, category]) => (
                      <div key={categoryKey}>
                        <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                          {category.label}
                        </div>
                        {Object.entries(category.fields).map(([fieldKey, field]) => (
                          <SelectItem key={fieldKey} value={field.path}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ajoutez plusieurs blocs ou retours à la ligne pour structurer les concaténations complexes.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Texte de secours</Label>
            <Input
              value={props.fallbackText || ""}
              onChange={(event) => setProp((draft: any) => (draft.fallbackText = event.target.value))}
              placeholder="Texte si la valeur calculée est vide"
            />
          </div>
        </div>
      )
    }

    if (isTextNode) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contenu</Label>
            <Textarea
              value={props.text || ""}
              rows={4}
              onChange={(event) => setProp((draft: any) => (draft.text = event.target.value))}
            />
          </div>
        </div>
      )
    }

    if (isRichText) {
      return (
        <div className="space-y-2 text-sm text-muted-foreground">
          Utilisez directement la zone de texte pour éditer le contenu riche.
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL de l'image</Label>
            <Input
              value={props.src || ""}
              onChange={(event) => setProp((draft: any) => (draft.src = event.target.value))}
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Largeur (px)</Label>
              <Input
                type="number"
                value={props.width || 200}
                onChange={(event) => setProp((draft: any) => (draft.width = Number(event.target.value)))}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Hauteur (px)</Label>
              <Input
                type="number"
                value={props.height || 200}
                onChange={(event) => setProp((draft: any) => (draft.height = Number(event.target.value)))}
              />
            </div>
          </div>
        </div>
      )
    }

    if (isRating) {
      const valueSource = (props.valueSource as "static" | "variable" | "template") || "static"
      const maxSource = (props.maxSource as "static" | "variable" | "template") || "static"

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source de la valeur</Label>
            <Select
              value={valueSource}
              onValueChange={(value) =>
                setProp((draft: any) => {
                  draft.valueSource = value
                  if (value === "static") {
                    draft.valueTemplate = ""
                    draft.valueVariablePath = ""
                  }
                  if (value === "variable") {
                    draft.valueTemplate = ""
                    draft.valueVariablePath = draft.valueVariablePath || ""
                  }
                  if (value === "template") {
                    draft.valueTemplate = draft.valueTemplate || ""
                    draft.valueVariablePath = ""
                  }
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Valeur fixe</SelectItem>
                <SelectItem value="variable">Variable liée</SelectItem>
                <SelectItem value="template">Expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {valueSource === "static" && (
            <div className="space-y-2">
              <Label>Valeur (fixe)</Label>
              <Input
                type="number"
                value={props.value || 0}
                onChange={(event) => setProp((draft: any) => (draft.value = Number(event.target.value)))}
              />
            </div>
          )}

          {valueSource === "variable" && (
            <div className="space-y-2">
              <Label>Variable</Label>
              <Select
                value={props.valueVariablePath || ""}
                onValueChange={(value) => setProp((draft: any) => (draft.valueVariablePath = value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une variable" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(variableRegistry).map(([categoryKey, category]) => (
                    <div key={categoryKey}>
                      <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                        {category.label}
                      </div>
                      {Object.entries(category.fields).map(([fieldKey, field]) => (
                        <SelectItem key={fieldKey} value={field.path}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {valueSource === "template" && (
            <div className="space-y-2">
              <Label>Expression numérique</Label>
              <Textarea
                value={props.valueTemplate || ""}
                rows={3}
                onChange={(event) => setProp((draft: any) => (draft.valueTemplate = event.target.value))}
                placeholder="Ex: {{ skills.length }}"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Source du maximum</Label>
            <Select
              value={maxSource}
              onValueChange={(value) =>
                setProp((draft: any) => {
                  draft.maxSource = value
                  if (value === "static") {
                    draft.maxTemplate = ""
                    draft.maxVariablePath = ""
                  }
                  if (value === "variable") {
                    draft.maxTemplate = ""
                    draft.maxVariablePath = draft.maxVariablePath || ""
                  }
                  if (value === "template") {
                    draft.maxTemplate = draft.maxTemplate || ""
                    draft.maxVariablePath = ""
                  }
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Valeur fixe</SelectItem>
                <SelectItem value="variable">Variable liée</SelectItem>
                <SelectItem value="template">Expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {maxSource === "static" && (
            <div className="space-y-2">
              <Label>Maximum (fixe)</Label>
              <Input
                type="number"
                value={props.max || 5}
                min={1}
                onChange={(event) => setProp((draft: any) => (draft.max = Math.max(1, Number(event.target.value))))}
              />
            </div>
          )}

          {maxSource === "variable" && (
            <div className="space-y-2">
              <Label>Variable (maximum)</Label>
              <Select
                value={props.maxVariablePath || ""}
                onValueChange={(value) => setProp((draft: any) => (draft.maxVariablePath = value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une variable" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(variableRegistry).map(([categoryKey, category]) => (
                    <div key={categoryKey}>
                      <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                        {category.label}
                      </div>
                      {Object.entries(category.fields).map(([fieldKey, field]) => (
                        <SelectItem key={fieldKey} value={field.path}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {maxSource === "template" && (
            <div className="space-y-2">
              <Label>Expression du maximum</Label>
              <Textarea
                value={props.maxTemplate || ""}
                rows={3}
                onChange={(event) => setProp((draft: any) => (draft.maxTemplate = event.target.value))}
                placeholder="Ex: {{ languages.length }}"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Icône</Label>
            <Select
              value={props.icon || "star"}
              onValueChange={(value) => setProp((draft: any) => (draft.icon = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="star">Étoile</SelectItem>
                <SelectItem value="circle">Cercle</SelectItem>
                <SelectItem value="square">Carré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Taille (px)</Label>
              <Input
                type="number"
                value={props.size || 18}
                onChange={(event) => setProp((draft: any) => (draft.size = Number(event.target.value)))}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Espacement (px)</Label>
              <Input
                type="number"
                value={props.spacing || 6}
                onChange={(event) => setProp((draft: any) => (draft.spacing = Number(event.target.value)))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Couleur active</Label>
              <Input
                type="color"
                value={props.activeColor || "#F59E0B"}
                onChange={(event) => setProp((draft: any) => (draft.activeColor = event.target.value))}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Couleur inactive</Label>
              <Input
                type="color"
                value={props.inactiveColor || "#E5E7EB"}
                onChange={(event) => setProp((draft: any) => (draft.inactiveColor = event.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Opacité inactive</Label>
              <Input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={props.inactiveOpacity ?? 0.35}
                onChange={(event) => setProp((draft: any) => (draft.inactiveOpacity = Number(event.target.value)))}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Affichage du label</Label>
              <Select
                value={props.showLabel ? props.labelFormat || "fraction" : "none"}
                onValueChange={(value) =>
                  setProp((draft: any) => {
                    if (value === "none") {
                      draft.showLabel = false
                      return
                    }
                    draft.showLabel = true
                    draft.labelFormat = value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Masqué</SelectItem>
                  <SelectItem value="fraction">Valeur / max</SelectItem>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )
    }

    if (isShape) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de forme</Label>
            <Select value={props.type || "rectangle"} onValueChange={(value) => setProp((draft: any) => (draft.type = value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="circle">Cercle</SelectItem>
                <SelectItem value="line">Ligne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Largeur</Label>
              <Input
                type="number"
                value={props.width || 120}
                onChange={(event) => setProp((draft: any) => (draft.width = Number(event.target.value)))}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Hauteur</Label>
              <Input
                type="number"
                value={props.height || 8}
                onChange={(event) => setProp((draft: any) => (draft.height = Number(event.target.value)))}
              />
            </div>
          </div>
        </div>
      )
    }

    if (isPage) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select
              value={props.orientation || "portrait"}
              onValueChange={(value) => setProp((draft: any) => (draft.orientation = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Paysage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Saut de page</Label>
            <Select
              value={props.pageBreak || "auto"}
              onValueChange={(value) => setProp((draft: any) => (draft.pageBreak = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatique</SelectItem>
                <SelectItem value="before">Avant la page</SelectItem>
                <SelectItem value="after">Après la page</SelectItem>
                <SelectItem value="avoid">Éviter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    return (
      <div className="text-sm text-muted-foreground">Aucun contenu spécifique à configurer.</div>
    )
  }

  const renderStyleTab = () => {
    const renderColorInput = (label: string, value: string, onChange: (color: string) => void) => (
      <TokenRefPicker
        label={label}
        category="color"
        value={value ?? ""}
        onChange={(token) => onChange(token)}
      />
    )

    const renderSpacingInput = (label: string, value: number | string | undefined, onChange: (val: number | string) => void) => (
      <TokenRefPicker
        label={label}
        category="spacing"
        value={typeof value === "string" ? value : value !== undefined ? String(value) : ""}
        onChange={(next) => {
          if (!next) {
            onChange(0)
            return
          }
          const numeric = Number(next)
          onChange(Number.isFinite(numeric) && next.trim() !== "" ? numeric : next)
        }}
      />
    )

    if (isTextNode || isVariableText) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <TokenRefPicker
              label="Taille"
              category="fontSize"
              value={typeof props.fontSize === "string" ? props.fontSize : props.fontSize !== undefined ? String(props.fontSize) : ""}
              onChange={(value) =>
                setProp((draft: any) => {
                  if (!value) {
                    draft.fontSize = 16
                  } else if (!Number.isNaN(Number(value))) {
                    draft.fontSize = Number(value)
                  } else {
                    draft.fontSize = value
                  }
                })
              }
            />
            <div className="space-y-2">
              <Label>Poids</Label>
              <Select
                value={props.fontWeight || "normal"}
                onValueChange={(value) => setProp((draft: any) => (draft.fontWeight = value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Fin</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="600">Semi-bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TokenRefPicker
            label="Police"
            category="font"
            value={typeof props.fontFamily === "string" ? props.fontFamily : ""}
            onChange={(value) =>
              setProp((draft: any) => {
                draft.fontFamily = value || "fonts.body"
              })
            }
          />

          {renderColorInput("Couleur du texte", props.color || "#000000", (color) => setProp((draft: any) => (draft.color = color)))}
          {renderColorInput(
            "Fond",
            props.background || "transparent",
            (color) => setProp((draft: any) => (draft.background = color)),
          )}

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="variable-outline"
              checked={Boolean(props.showOutline)}
              onCheckedChange={(checked) => setProp((draft: any) => (draft.showOutline = Boolean(checked)))}
            />
            <Label htmlFor="variable-outline" className="text-sm font-medium">
              Afficher le contour de sélection
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Interligne</Label>
              <Input
                type="number"
                step="0.05"
                value={props.lineHeight || 1.4}
                onChange={(event) => setProp((draft: any) => (draft.lineHeight = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Espacement</Label>
              <Input
                type="number"
                step="0.1"
                value={props.letterSpacing || 0}
                onChange={(event) => setProp((draft: any) => (draft.letterSpacing = Number(event.target.value)))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alignement</Label>
            <Select
              value={props.textAlign || "left"}
              onValueChange={(value) => setProp((draft: any) => (draft.textAlign = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {renderSpacingInput("Padding", props.padding, (value) => setProp((draft: any) => (draft.padding = value)))}
            {renderSpacingInput("Rayon", props.borderRadius, (value) => setProp((draft: any) => (draft.borderRadius = value)))}
          </div>
        </div>
      )
    }

    if (isRepeat) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Espacement vertical (px)</Label>
            <Input
              type="number"
              min={0}
              value={props.gap ?? 16}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10)
                setProp((draft: any) => (draft.gap = Number.isFinite(value) ? value : 0))
              }}
            />
          </div>
        </div>
      )
    }

    if (isContainer || isSection || isStack || isGrid) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fond</Label>
            <Select
              value={props.background || "transparent"}
              onValueChange={(value) => setProp((draft: any) => (draft.background = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transparent">Transparent</SelectItem>
                {Object.entries(tokens.colors).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {key} ({value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Padding</Label>
              <Input
                type="number"
                value={props.padding || 0}
                onChange={(event) => setProp((draft: any) => (draft.padding = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Margin</Label>
              <Input
                type="number"
                value={props.margin || 0}
                onChange={(event) => setProp((draft: any) => (draft.margin = Number(event.target.value)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Rayon</Label>
              <Input
                type="number"
                value={props.borderRadius || 0}
                onChange={(event) => setProp((draft: any) => (draft.borderRadius = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ombre</Label>
              <Select
                value={props.boxShadow || "none"}
                onValueChange={(value) => setProp((draft: any) => (draft.boxShadow = value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tokens.shadows).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(isStack || isSection) && (
            <div className="space-y-2">
              <Label>Espacement interne</Label>
              <Input
                type="number"
                value={props.gap || 0}
                onChange={(event) => setProp((draft: any) => (draft.gap = Number(event.target.value)))}
              />
            </div>
          )}

          {isStack && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={props.direction || "vertical"}
                  onValueChange={(value) => setProp((draft: any) => (draft.direction = value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Verticale</SelectItem>
                    <SelectItem value="horizontal">Horizontale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alignement transversal</Label>
                <Select value={props.align || "stretch"} onValueChange={(value) => setProp((draft: any) => (draft.align = value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stretch">Étendre</SelectItem>
                    <SelectItem value="start">Début</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="end">Fin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Répartition</Label>
                <Select
                  value={props.justify || "start"}
                  onValueChange={(value) => setProp((draft: any) => (draft.justify = value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Début</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="end">Fin</SelectItem>
                    <SelectItem value="between">Entre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isGrid && (
            <div className="space-y-2">
              <Label>Colonnes / Lignes</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={props.columns || 1}
                  onChange={(event) => setProp((draft: any) => (draft.columns = Number(event.target.value)))}
                  placeholder="Colonnes"
                />
                <Input
                  type="number"
                  value={props.rows || 1}
                  onChange={(event) => setProp((draft: any) => (draft.rows = Number(event.target.value)))}
                  placeholder="Lignes"
                />
              </div>
            </div>
          )}
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="space-y-4">
          {renderColorInput(
            "Bordure",
            props.borderColor || "#000000",
            (color) => setProp((draft: any) => (draft.borderColor = color)),
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Épaisseur</Label>
              <Input
                type="number"
                value={props.borderWidth || 0}
                onChange={(event) => setProp((draft: any) => (draft.borderWidth = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rayon</Label>
              <Input
                type="number"
                value={props.borderRadius || 0}
                onChange={(event) => setProp((draft: any) => (draft.borderRadius = Number(event.target.value)))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mode de remplissage</Label>
            <Select
              value={props.objectFit || "cover"}
              onValueChange={(value) => setProp((draft: any) => (draft.objectFit = value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Couverture</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Remplir</SelectItem>
                <SelectItem value="scale-down">Échelle réduite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    if (isBadge) {
      return (
        <div className="space-y-4">
          {renderColorInput("Texte", props.color || "#1D4ED8", (color) => setProp((draft: any) => (draft.color = color)))}
          {renderColorInput("Fond", props.background || "#DBEAFE", (color) => setProp((draft: any) => (draft.background = color)))}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Rayon</Label>
              <Input
                type="number"
                value={props.borderRadius || 999}
                onChange={(event) => setProp((draft: any) => (draft.borderRadius = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Padding horizontal</Label>
              <Input
                type="number"
                value={props.paddingX || 12}
                onChange={(event) => setProp((draft: any) => (draft.paddingX = Number(event.target.value)))}
              />
            </div>
          </div>
        </div>
      )
    }

    if (isRating) {
      return (
        <div className="space-y-4">
          {renderColorInput(
            "Couleur active",
            props.activeColor || "#F59E0B",
            (color) => setProp((draft: any) => (draft.activeColor = color)),
          )}
          {renderColorInput(
            "Couleur inactive",
            props.inactiveColor || "#E5E7EB",
            (color) => setProp((draft: any) => (draft.inactiveColor = color)),
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Taille icône</Label>
              <Input
                type="number"
                value={props.size || 18}
                onChange={(event) => setProp((draft: any) => (draft.size = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Espacement</Label>
              <Input
                type="number"
                value={props.spacing || 6}
                onChange={(event) => setProp((draft: any) => (draft.spacing = Number(event.target.value)))}
              />
            </div>
          </div>
        </div>
      )
    }

    if (isShape) {
      return (
        <div className="space-y-4">
          {renderColorInput("Couleur", props.color || "#1F2937", (color) => setProp((draft: any) => (draft.color = color)))}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Rotation (°)</Label>
              <Input
                type="number"
                value={props.rotate || 0}
                onChange={(event) => setProp((draft: any) => (draft.rotate = Number(event.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ombre</Label>
              <Select
                value={props.shadow || "none"}
                onValueChange={(value) => setProp((draft: any) => (draft.shadow = value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="0 1px 2px rgba(0,0,0,0.1)">Douce</SelectItem>
                  <SelectItem value="0 10px 25px rgba(0,0,0,0.15)">Prononcée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )
    }

    return <div className="text-sm text-muted-foreground">Aucun style spécifique.</div>
  }

  const renderBehaviorTab = () => {
    if (isVariableText) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="conditional-display"
              checked={props.conditionalDisplay?.enabled || false}
              onCheckedChange={(checked) =>
                setProp(
                  (draft: any) =>
                    (draft.conditionalDisplay = {
                      ...draft.conditionalDisplay,
                      enabled: Boolean(checked),
                    }),
                )
              }
            />
            <Label htmlFor="conditional-display">Affichage conditionnel</Label>
          </div>

          {props.conditionalDisplay?.enabled && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label>Variable à tester</Label>
                <Select
                  value={props.conditionalDisplay?.variablePath || ""}
                  onValueChange={(value) =>
                    setProp(
                      (draft: any) =>
                        (draft.conditionalDisplay = {
                          ...draft.conditionalDisplay,
                          variablePath: value,
                        }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(variableRegistry).map(([categoryKey, category]) => (
                      <div key={categoryKey}>
                        <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                          {category.label}
                        </div>
                        {Object.entries(category.fields).map(([fieldKey, field]) => (
                          <SelectItem key={fieldKey} value={field.path}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Opérateur</Label>
                <Select
                  value={props.conditionalDisplay?.operator || "exists"}
                  onValueChange={(value) =>
                    setProp(
                      (draft: any) =>
                        (draft.conditionalDisplay = {
                          ...draft.conditionalDisplay,
                          operator: value,
                        }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITIONAL_OPERATORS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {props.conditionalDisplay?.operator && props.conditionalDisplay.operator !== "exists" && (
                <div className="space-y-2">
                  <Label>Valeur comparée / Expression JSON</Label>
                  <Textarea
                    value={props.conditionalDisplay?.compareValue || ""}
                    onChange={(event) =>
                      setProp(
                        (draft: any) =>
                          (draft.conditionalDisplay = {
                            ...draft.conditionalDisplay,
                            compareValue: event.target.value,
                          }),
                      )
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pour JSONLogic, fournissez une expression JSON valide faisant référence aux variables du profil.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (isPage) {
      return (
        <div className="space-y-2 text-sm text-muted-foreground">
          Configurez les sauts de page et utilisez l'assistant IA pour obtenir des recommandations automatiques.
        </div>
      )
    }

    return <div className="text-sm text-muted-foreground">Aucun comportement spécifique.</div>
  }

  const userIdCandidates = [
    cvData?.user?.id,
    cvData?.profile?.id,
    cvData?.personal?.id,
    cvData?.id,
  ] as Array<unknown>
  const userId =
    userIdCandidates.find((candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
    ) ?? null
  const fieldType = isVariableText ? props.variablePath || props.text || name : name
  const repeatSection = isRepeat ? props.collectionPath || fieldType : fieldType
  const assistantContext: AIAssistantContext = {
    cvData,
    userId: userId ?? undefined,
    fieldType,
    section: repeatSection,
  }

  const renderAITab = () => {
    if (isRepeat) {
      const blueprint = props.generatedTemplate || ""
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Demandez à l'IA de proposer une section complète (titre + items) pour cette collection répétée.
          </p>
          <AIFieldAssistant
            value={blueprint}
            onApply={(text) =>
              setProp((draft: any) => {
                draft.generatedTemplate = text
              })
            }
            context={{ ...assistantContext, section: repeatSection }}
            showAutoSection
            showGenerate={false}
            showImprove={false}
            showRephrase={false}
            showTranslate={false}
            showKeywords={false}
          />
        </div>
      )
    }

    if (isTextNode || isVariableText || isRichText) {
      const currentText = isRichText ? "" : props.text || props.fallbackText || ""
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisez l'assistant IA pour générer, reformuler ou traduire le contenu sélectionné, ou demander un remplissage
            automatique.
          </p>
          <AIFieldAssistant
            value={currentText}
            onApply={(text) =>
              setProp((draft: any) => {
                if (isVariableText) {
                  draft.fallbackText = text
                } else {
                  draft.text = text
                }
              })
            }
            context={assistantContext}
            showTranslate
            showKeywords
            showAutoFill={Boolean(userId) && (isVariableText || isTextNode)}
          />
        </div>
      )
    }

    return <div className="text-sm text-muted-foreground">Assistant IA non disponible pour ce bloc.</div>
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="content">Contenu</TabsTrigger>
        <TabsTrigger value="style">Style</TabsTrigger>
        <TabsTrigger value="behavior">Comportement</TabsTrigger>
        <TabsTrigger value="ai">IA</TabsTrigger>
      </TabsList>

      <TabsContent value="content">{renderContentTab()}</TabsContent>
      <TabsContent value="style">{renderStyleTab()}</TabsContent>
      <TabsContent value="behavior">{renderBehaviorTab()}</TabsContent>
      <TabsContent value="ai">{renderAITab()}</TabsContent>
    </Tabs>
  )
}

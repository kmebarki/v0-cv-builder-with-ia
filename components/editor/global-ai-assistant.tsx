"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { Element, useEditor } from "@craftjs/core"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  LayoutTemplate,
  Binary,
  Palette,
  ScanText,
  Loader2,
  Wand2,
  Workflow,
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
} from "lucide-react"
import {
  suggestTemplateLayout,
  helpWithBindingExpression,
  suggestDesignDirections,
  recommendPageBreaks,
} from "@/lib/actions/ai"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { toast } from "sonner"
import { PageNode } from "@/components/editor/nodes/page-node"
import { SectionNode } from "@/components/editor/nodes/section-node"
import { StackNode } from "@/components/editor/nodes/stack-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { RepeatNode } from "@/components/editor/nodes/repeat-node"
import { buildPlanFromWarnings, diffPlanOperations, type PlanDiffEntry } from "@/lib/editor/ai-plan"
import type { PlanOperation } from "@/lib/editor/ai-plan"
import type { PaginationResult } from "@/lib/editor/pagination-engine"
import { cn } from "@/lib/utils"

export function GlobalAIAssistant() {
  const [open, setOpen] = useState(false)
  const { cvData, runPagination, setPaginationWarnings } = useTemplateEditor()
  const { actions, query } = useEditor()

  const [layoutPrompt, setLayoutPrompt] = useState("Profil technique, orienté SaaS")
  const [layoutResult, setLayoutResult] = useState("")
  const [isLayoutPending, startLayout] = useTransition()

  const [formulaPrompt, setFormulaPrompt] = useState("Afficher l'email du candidat en majuscules")
  const [formulaResult, setFormulaResult] = useState("")
  const [isFormulaPending, startFormula] = useTransition()

  const [designPrompt, setDesignPrompt] = useState("Palette moderne, section compétences en badges")
  const [designResult, setDesignResult] = useState("")
  const [isDesignPending, startDesign] = useTransition()

  const [paginationResult, setPaginationResult] = useState("")
  const [isPaginationPending, startPagination] = useTransition()

  const [automationSummary, setAutomationSummary] = useState("")
  const [automationOperations, setAutomationOperations] = useState<PlanOperation[]>([])
  const [automationDiffs, setAutomationDiffs] = useState<PlanDiffEntry[]>([])
  const [automationSelection, setAutomationSelection] = useState<string[]>([])
  const [automationSnapshot, setAutomationSnapshot] = useState<PaginationResult | null>(null)
  const [isApplyingPlan, setIsApplyingPlan] = useState(false)
  const [isAutomationPending, startAutomation] = useTransition()

  const getNodeSnapshot = useCallback(
    (id: string) => {
      try {
        const node = query.node(id).get()
        if (!node) return null
        return {
          id,
          type: String(node.data.type ?? "unknown"),
          displayName: typeof node.data.displayName === "string" ? node.data.displayName : undefined,
          parentId: node.data.parent as string | null,
          props: { ...(node.data.props as Record<string, any>) },
        }
      } catch (error) {
        return null
      }
    },
    [query],
  )

  const getParentSnapshot = useCallback(
    (id: string) => {
      const node = getNodeSnapshot(id)
      if (!node?.parentId) return null
      return getNodeSnapshot(node.parentId)
    },
    [getNodeSnapshot],
  )

  const resolveGroupOwner = useCallback(
    (groupId: string) => {
      const match = /^repeat-(.+)$/.exec(groupId)
      if (!match) return null
      return getNodeSnapshot(match[1])
    },
    [getNodeSnapshot],
  )

  const planContext = useMemo(
    () => ({
      getNode: getNodeSnapshot,
      getParentOf: getParentSnapshot,
      resolveGroupOwner,
    }),
    [getNodeSnapshot, getParentSnapshot, resolveGroupOwner],
  )

  useEffect(() => {
    const pending = new Set(
      automationDiffs.filter((entry) => entry.status === "pending").map((entry) => entry.operation.id),
    )
    setAutomationSelection((previous) => previous.filter((id) => pending.has(id)))
  }, [automationDiffs])

  const injectLayoutIntoCanvas = () => {
    try {
      const layoutTree = query
        .parseReactElement(
          <Element is={PageNode} canvas padding={48} background="#FFFFFF">
            <Element is={SectionNode} canvas title="Profil" padding={24} background="#F8FAFC" gap={16}>
              <Element is={StackNode} canvas direction="vertical" gap={12}>
                <Element
                  is={VariableTextNode}
                  mode="template"
                  template="{{ user.lastName | uppercase }} {{ user.firstName | capitalize }}"
                  fontSize={28}
                  fontWeight="600"
                />
                <Element
                  is={VariableTextNode}
                  variablePath="user.currentPosition"
                  fontSize={18}
                  color="#4B5563"
                />
                <Element
                  is={VariableTextNode}
                  variablePath="user.professionalSummary"
                  fontSize={14}
                  color="#334155"
                />
              </Element>
            </Element>

            <Element is={SectionNode} canvas title="Expériences" padding={24} gap={16}>
              <Element
                is={RepeatNode}
                canvas
                collectionPath="experiences"
                itemAlias="experience"
                indexAlias="experienceIndex"
                emptyFallback="Aucune expérience disponible"
                gap={16}
              >
                <Element is={StackNode} canvas direction="vertical" gap={6}>
                  <Element
                    is={VariableTextNode}
                    mode="template"
                    template="{{ experience.position }} — {{ experience.company }}"
                    fontSize={16}
                    fontWeight="600"
                  />
                  <Element
                    is={VariableTextNode}
                    mode="template"
                    template="{{ experience.startDate | dateFormat }} → {{ experience.endDate | dateFormat }}"
                    fontSize={12}
                    color="#64748B"
                  />
                  <Element
                    is={VariableTextNode}
                    variablePath="experience.description"
                    fontSize={13}
                    color="#1F2937"
                  />
                </Element>
              </Element>
            </Element>

            <Element is={SectionNode} canvas title="Formations" padding={24} gap={16}>
              <Element
                is={RepeatNode}
                canvas
                collectionPath="education"
                itemAlias="educationItem"
                indexAlias="educationIndex"
                emptyFallback="Aucune formation"
                gap={12}
              >
                <Element is={StackNode} canvas direction="vertical" gap={4}>
                  <Element
                    is={VariableTextNode}
                    mode="template"
                    template="{{ educationItem.degree }} — {{ educationItem.institution }}"
                    fontSize={15}
                    fontWeight="600"
                  />
                  <Element
                    is={VariableTextNode}
                    mode="template"
                    template="{{ educationItem.startDate | dateFormat }} → {{ educationItem.endDate | dateFormat }}"
                    fontSize={12}
                    color="#64748B"
                  />
                  <Element
                    is={VariableTextNode}
                    variablePath="educationItem.description"
                    fontSize={13}
                    color="#1F2937"
                  />
                </Element>
              </Element>
            </Element>

            <Element is={SectionNode} canvas title="Compétences" padding={24} gap={12}>
              <Element
                is={RepeatNode}
                canvas
                collectionPath="skills"
                itemAlias="skill"
                indexAlias="skillIndex"
                emptyFallback="Ajoutez vos compétences"
                gap={8}
              >
                <Element
                  is={VariableTextNode}
                  variablePath="skill.name"
                  fontSize={13}
                  color="#1F2937"
                  background="#E0F2FE"
                  padding={6}
                  borderRadius={999}
                />
              </Element>
            </Element>
          </Element>,
        )
        .toNodeTree()

      actions.addNodeTree(layoutTree, "ROOT")
      toast.success("Structure IA insérée dans le canvas")
    } catch (error) {
      console.error("Impossible d'injecter la structure IA", error)
      toast.error("L'injection automatique a échoué")
    }
  }

  const handleLayout = () => {
    startLayout(async () => {
      const result = await suggestTemplateLayout({
        prompt: layoutPrompt,
        profile: cvData,
      })
      if (result.success && result.text) {
        setLayoutResult(result.text)
      } else {
        toast.error(result.error || "Impossible de générer la mise en page")
      }
    })
  }

  const handleFormula = () => {
    startFormula(async () => {
      const result = await helpWithBindingExpression(formulaPrompt, cvData)
      if (result.success && result.text) {
        setFormulaResult(result.text)
      } else {
        toast.error(result.error || "Impossible de générer la formule")
      }
    })
  }

  const handleDesign = () => {
    startDesign(async () => {
      const result = await suggestDesignDirections({ prompt: designPrompt, profile: cvData })
      if (result.success && result.text) {
        setDesignResult(result.text)
      } else {
        toast.error(result.error || "Impossible de proposer une direction design")
      }
    })
  }

  const handlePagination = () => {
    startPagination(async () => {
      const result = await recommendPageBreaks(cvData)
      if (result.success && result.text) {
        setPaginationResult(result.text)
      } else {
        toast.error(result.error || "Impossible de recommander des sauts de page")
      }
    })
  }

  const renderLoading = (label: string) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  )

  const handleAutomationPlan = () => {
    startAutomation(async () => {
      const result = runPagination?.()
      if (!result) {
        toast.error("Impossible d'analyser la pagination actuelle")
        return
      }
      setAutomationSnapshot(result)
      setPaginationWarnings(result.warnings)
      const plan = buildPlanFromWarnings(result.warnings, planContext)
      setAutomationSummary(plan.summary)
      setAutomationOperations(plan.operations)
      const diff = diffPlanOperations(plan.operations, planContext)
      setAutomationDiffs(diff)
      setAutomationSelection(diff.filter((entry) => entry.status === "pending").map((entry) => entry.operation.id))
      if (plan.operations.length > 0) {
        toast.success("Plan IA généré, vérifiez les actions proposées")
      } else {
        toast.info("Aucune action nécessaire : la pagination est stable")
      }
    })
  }

  const pendingOperations = useMemo(
    () => automationDiffs.filter((entry) => entry.status === "pending"),
    [automationDiffs],
  )

  const selectableOperationIds = useMemo(
    () => new Set(pendingOperations.map((entry) => entry.operation.id)),
    [pendingOperations],
  )

  const selectedPendingCount = useMemo(
    () => automationSelection.filter((id) => selectableOperationIds.has(id)).length,
    [automationSelection, selectableOperationIds],
  )

  const toggleAutomationSelection = (operationId: string) => {
    if (!selectableOperationIds.has(operationId)) {
      return
    }
    setAutomationSelection((previous) =>
      previous.includes(operationId)
        ? previous.filter((value) => value !== operationId)
        : [...previous, operationId],
    )
  }

  const applyPlanOperations = useCallback(
    (operationIds: string[]) => {
      const unique = Array.from(new Set(operationIds)).filter((id) => selectableOperationIds.has(id))
      if (unique.length === 0) {
        toast.info("Sélectionnez au moins une action à appliquer")
        return
      }

      const pendingEntries = automationDiffs.filter(
        (entry) => entry.status === "pending" && unique.includes(entry.operation.id),
      )

      if (pendingEntries.length === 0) {
        toast.info("Les actions choisies sont déjà en place")
        return
      }

      setIsApplyingPlan(true)
      try {
        const history = (actions as any).history
        const run = () => {
          pendingEntries.forEach(({ operation }) => {
            actions.setProp(operation.nodeId, (props: any) => {
              for (const [key, value] of Object.entries(operation.props)) {
                props[key] = value
              }
            })
          })
        }
        if (history?.throttle) {
          history.throttle(run)
        } else {
          run()
        }

        const pagination = runPagination?.()
        if (pagination) {
          setPaginationWarnings(pagination.warnings)
          setAutomationSnapshot(pagination)
        }

        const updatedDiff = diffPlanOperations(automationOperations, planContext)
        setAutomationDiffs(updatedDiff)
        setAutomationSelection(
          updatedDiff.filter((entry) => entry.status === "pending").map((entry) => entry.operation.id),
        )
        toast.success(`Actions appliquées (${pendingEntries.length})`)
      } catch (error) {
        console.error("[ai] unable to apply plan", error)
        toast.error("Impossible d'appliquer les recommandations")
      } finally {
        setIsApplyingPlan(false)
      }
    },
    [actions, automationDiffs, automationOperations, planContext, runPagination, selectableOperationIds, setPaginationWarnings],
  )

  const handleApplySelection = () => {
    applyPlanOperations(automationSelection)
  }

  const handleApplyAll = () => {
    applyPlanOperations(Array.from(selectableOperationIds))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="fixed bottom-6 right-6 z-50 shadow-lg">
          <Sparkles className="mr-2 h-4 w-4" />
          Assistant IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assistant IA avancé</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="layout" className="mt-4">
          <TabsList>
            <TabsTrigger value="layout">
              <LayoutTemplate className="h-4 w-4" /> Mise en page
            </TabsTrigger>
            <TabsTrigger value="formula">
              <Binary className="h-4 w-4" /> Formules & bindings
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette className="h-4 w-4" /> Direction graphique
            </TabsTrigger>
            <TabsTrigger value="pagination">
              <ScanText className="h-4 w-4" /> Pagination
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Workflow className="h-4 w-4" /> Plan → Diff → Patch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Génère automatiquement une structure de CV complète (sections, hiérarchie et recommandations de blocs).
            </p>
            <Textarea
              value={layoutPrompt}
              onChange={(event) => setLayoutPrompt(event.target.value)}
              placeholder="Décrivez le profil ou les besoins de mise en page"
              rows={4}
            />
            <Button onClick={handleLayout} disabled={isLayoutPending}>
              {isLayoutPending ? renderLoading("Génération de la structure...") : "Générer une proposition"}
            </Button>
            <Button variant="outline" onClick={injectLayoutIntoCanvas} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Injecter une mise en page IA
            </Button>
            {layoutResult && (
              <Textarea value={layoutResult} readOnly rows={10} className="font-mono text-sm" />
            )}
          </TabsContent>

          <TabsContent value="formula" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Décris le binding souhaité : concaténation, conditions, filtres, formatage… l'assistant propose du JSONLogic ou des
              expressions prêtes à l'emploi.
            </p>
            <Textarea
              value={formulaPrompt}
              onChange={(event) => setFormulaPrompt(event.target.value)}
              placeholder="Ex : Afficher le nom complet en majuscules si l'email existe"
              rows={4}
            />
            <Button onClick={handleFormula} disabled={isFormulaPending}>
              {isFormulaPending ? renderLoading("Analyse de la formule...") : "Proposer une formule"}
            </Button>
            {formulaResult && (
              <Textarea value={formulaResult} readOnly rows={10} className="font-mono text-sm" />
            )}
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Obtiens des recommandations de design tokens, de palettes, de typographies et de composants graphiques adaptés.
            </p>
            <Textarea
              value={designPrompt}
              onChange={(event) => setDesignPrompt(event.target.value)}
              placeholder="Ex : CV bilingue orienté product design"
              rows={4}
            />
            <Button onClick={handleDesign} disabled={isDesignPending}>
              {isDesignPending ? renderLoading("Analyse de la direction artistique...") : "Suggérer une direction"}
            </Button>
            {designResult && (
              <Textarea value={designResult} readOnly rows={10} className="font-mono text-sm" />
            )}
          </TabsContent>

          <TabsContent value="pagination" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyse le profil et suggère des emplacements de sauts de page, ainsi que des actions pour éviter les veuves/orphelines.
            </p>
            <Button onClick={handlePagination} disabled={isPaginationPending}>
              {isPaginationPending ? renderLoading("Analyse de la pagination...") : "Analyser les sauts de page"}
            </Button>
            {paginationResult && (
              <Textarea value={paginationResult} readOnly rows={8} className="font-mono text-sm" />
            )}
          </TabsContent>

          <TabsContent value="automation" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                L'assistant planifie les corrections, calcule les diffs sur le canvas puis applique les patchs sélectionnés en tenant
                compte du moteur de pagination.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleAutomationPlan} disabled={isAutomationPending}>
                  {isAutomationPending
                    ? renderLoading("Analyse de la structure en cours...")
                    : "Analyser et générer un plan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleApplySelection}
                  disabled={isApplyingPlan || selectedPendingCount === 0}
                  className="flex items-center gap-2"
                >
                  {isApplyingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Appliquer la sélection
                </Button>
                <Button
                  variant="outline"
                  onClick={handleApplyAll}
                  disabled={isApplyingPlan || selectableOperationIds.size === 0}
                  className="flex items-center gap-2"
                >
                  {isApplyingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDashed className="h-4 w-4" />}
                  Appliquer toutes les actions
                </Button>
              </div>
              {automationSummary && <p className="text-sm text-muted-foreground">{automationSummary}</p>}
              <div className="text-xs text-muted-foreground">
                {selectableOperationIds.size > 0 ? (
                  <span>
                    {selectableOperationIds.size} action{selectableOperationIds.size > 1 ? "s" : ""} en attente • {" "}
                    {selectedPendingCount} sélectionnée{selectedPendingCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>Aucune action en attente.</span>
                )}
              </div>
            </div>

            {automationDiffs.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {automationDiffs.map((entry) => {
                  const isPending = entry.status === "pending"
                  const isBlocked = entry.status === "blocked"
                  const statusLabel =
                    entry.status === "pending"
                      ? "À appliquer"
                      : entry.status === "applied"
                        ? "Déjà appliqué"
                        : "Non supporté"
                  const statusVariant = entry.status === "blocked" ? "destructive" : entry.status === "applied" ? "secondary" : "default"
                  return (
                    <label
                      key={entry.operation.id}
                      className={cn(
                        "flex items-start gap-3 p-3",
                        isBlocked && "bg-destructive/5",
                        isPending && "hover:bg-muted/60",
                      )}
                    >
                      <Checkbox
                        checked={automationSelection.includes(entry.operation.id)}
                        onCheckedChange={() => toggleAutomationSelection(entry.operation.id)}
                        disabled={!isPending}
                        className="mt-1"
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium leading-none">{entry.operation.label}</span>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                          <Badge variant="outline">{entry.operation.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.operation.reason}</p>
                        {entry.status === "pending" && entry.mismatches && (
                          <p className="text-xs text-muted-foreground">
                            Ajustements : {Object.entries(entry.mismatches)
                              .map(([prop, { current, expected }]) => `${prop} (${String(current)} → ${String(expected)})`)
                              .join(", ")}
                          </p>
                        )}
                        {entry.status === "blocked" && entry.blockingProps && entry.blockingProps.length > 0 && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" /> Propriétés indisponibles : {entry.blockingProps.join(", ")}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Générez un plan pour visualiser les actions recommandées et appliquer sélectivement les corrections.
              </div>
            )}

            {automationSnapshot && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ScanText className="h-4 w-4" /> État du moteur de pagination
                </div>
                {automationSnapshot.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {automationSnapshot.warnings.map((warning, index) => (
                      <li key={`${warning.type}-${warning.nodeId ?? warning.groupId ?? index}`}>{warning.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Aucun avertissement actif après la dernière analyse.</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

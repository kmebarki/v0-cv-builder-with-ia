"use client"

import { Editor, Frame, Element, useEditor } from "@craftjs/core"
import { Layers } from "@craftjs/layers"
import { Container } from "@/components/editor/nodes/container"
import { TextNode } from "@/components/editor/nodes/text-node"
import { ImageNode } from "@/components/editor/nodes/image-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { Toolbox } from "@/components/editor/toolbox"
import { SettingsPanel } from "@/components/editor/settings-panel"
import { EditorHeader } from "@/components/editor/editor-header"
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import { RichTextNode } from "@/components/editor/nodes/rich-text-node"
import { PageNode } from "@/components/editor/nodes/page-node"
import { SectionNode } from "@/components/editor/nodes/section-node"
import { StackNode } from "@/components/editor/nodes/stack-node"
import { GridNode } from "@/components/editor/nodes/grid-node"
import { BadgeNode } from "@/components/editor/nodes/badge-node"
import { RatingNode } from "@/components/editor/nodes/rating-node"
import { ShapeNode } from "@/components/editor/nodes/shape-node"
import { RepeatNode } from "@/components/editor/nodes/repeat-node"
import {
  TemplateEditorContext,
  useTemplateEditor,
  type PreviewMode,
  type GuideDefinition,
} from "@/components/editor/editor-context"
import { BindingProvider } from "@/components/editor/binding-context"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ZoomIn,
  ZoomOut,
  Grid2X2,
  Magnet,
  Ruler,
  Plus,
  Settings2,
  Trash2,
  Sun,
  Moon,
  Focus,
  Lasso,
  Lock,
  Unlock,
  CopyPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GlobalAIAssistant } from "@/components/editor/global-ai-assistant"
import type { AdminFieldRuntimeSnapshot } from "@/lib/editor/admin-field-runtime"
import type { DesignTokenDefinition } from "@/lib/editor/design-tokens-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SnapManager } from "@/components/editor/snap-manager"
import type { SnapIndicator } from "@/components/editor/snap-manager"
import {
  PaginationEngine,
  extractPaginationDocument,
  type PaginationWarning,
  type PaginationResult,
} from "@/lib/editor/pagination-engine"
import { useAdminFieldRuntime } from "@/components/editor/use-admin-field-runtime"

interface CVEditorProps {
  cvId: string
  cvName: string
  initialStructure: any
  cvData: any
  adminRuntime: AdminFieldRuntimeSnapshot
  tokens: DesignTokenDefinition
  tokenSource?: string
  onSave: (structure: string) => Promise<void>
}

export function CVEditor({
  cvName,
  initialStructure,
  cvData,
  adminRuntime,
  tokens,
  tokenSource,
  onSave,
}: CVEditorProps) {
  const { runtime, validate: validateAdmin } = useAdminFieldRuntime(adminRuntime)
  const [isSaving, setIsSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("a4")
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGuides, setShowGuides] = useState(true)
  const [guides, setGuides] = useState<GuideDefinition[]>([])
  const [gridSize, setGridSize] = useState(40)
  const [gridColor, setGridColor] = useState("#6366F1")
  const [gridOpacity, setGridOpacity] = useState(0.08)
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null)
  const [snapPreviewState, setSnapPreviewState] = useState<Record<string, { x: number; y: number }>>({})
  const [snapIndicators, setSnapIndicators] = useState<SnapIndicator[]>([])
  const paginationEngineRef = useRef(new PaginationEngine())
  const [paginationWarnings, setPaginationWarnings] = useState<PaginationWarning[]>([])
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStateRef = useRef<{ start: { x: number; y: number }; scroll: { left: number; top: number } } | null>(null)
  const snapManagerRef = useRef(
    new SnapManager({
      canvas: null,
      gridSize: 40,
      guides: [],
      snapEnabled: true,
      zoom: 1,
    }),
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(true)
      }
      if (event.key === "Shift") {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
      if (event.key === "Shift") {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    snapManagerRef.current.updateConfig({
      canvas: canvasElement,
      gridSize,
      guides,
      snapEnabled: snapToGrid,
      zoom,
    })
  }, [canvasElement, gridSize, guides, snapToGrid, zoom])

  const registerNodeElement = useCallback((id: string, element: HTMLElement) => {
    snapManagerRef.current.registerElement(id, element)
  }, [])

  const unregisterNodeElement = useCallback((id: string) => {
    snapManagerRef.current.unregisterElement(id)
  }, [])

  const setSnapPreview = useCallback((preview: Record<string, { x: number; y: number }>) => {
    setSnapPreviewState(preview)
  }, [])

  const clearSnapPreview = useCallback(() => {
    setSnapPreviewState({})
  }, [])

  const computePagination = useCallback((): PaginationResult | null => {
    if (!canvasElement) return null
    try {
      const documentDefinition = extractPaginationDocument(canvasElement, { zoom })
      return paginationEngineRef.current.compose(documentDefinition)
    } catch (error) {
      console.error("[editor] pagination computation failed", error)
      return null
    }
  }, [canvasElement, zoom])

  useEffect(() => {
    if (!canvasElement) {
      setPaginationWarnings([])
      return
    }
    if (typeof window === "undefined") return

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        const result = computePagination()
        setPaginationWarnings(result?.warnings ?? [])
      })
    }

    schedule()

    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(() => schedule()) : null
    observer?.observe(canvasElement, { childList: true, subtree: true, attributes: true })

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [canvasElement, computePagination])

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return
      if (event.button !== 0) return

      if (isSpacePressed) {
        event.preventDefault()
        viewportRef.current.setPointerCapture(event.pointerId)
        panStateRef.current = {
          start: { x: event.clientX, y: event.clientY },
          scroll: { left: viewportRef.current.scrollLeft, top: viewportRef.current.scrollTop },
        }
        setIsPanning(true)
        return
      }
    },
    [isSpacePressed],
  )

  const handleViewportPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return
    if (!panStateRef.current) return

    const deltaX = panStateRef.current.start.x - event.clientX
    const deltaY = panStateRef.current.start.y - event.clientY
    viewportRef.current.scrollTo({
      left: panStateRef.current.scroll.left + deltaX,
      top: panStateRef.current.scroll.top + deltaY,
    })
  }, [])

  const handleViewportPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return
      if (panStateRef.current) {
        viewportRef.current.releasePointerCapture(event.pointerId)
      }
      panStateRef.current = null
      setIsPanning(false)
    },
    [],
  )

  const snapCoordinate = useCallback(
    (value: number) => {
      if (!snapToGrid) return value
      if (gridSize <= 0) return value
      return Math.round(value / gridSize) * gridSize
    },
    [gridSize, snapToGrid],
  )

  const handleSave = async (query: any) => {
    setIsSaving(true)
    try {
      const json = query.serialize()
      await onSave(json)
      toast.success("CV sauvegardé avec succès")
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const initialTree = useMemo(() => {
    if (!initialStructure) return undefined
    try {
      if (typeof initialStructure === "string") {
        return JSON.parse(initialStructure)
      }
      return initialStructure
    } catch (error) {
      console.error("Impossible de parser la structure du CV", error)
      return undefined
    }
  }, [initialStructure])

  const addGuide = useCallback(
    (guide: GuideDefinition) => {
      setGuides((current) => [...current, guide])
    },
    [setGuides],
  )

  const updateGuide = useCallback((id: string, updates: Partial<GuideDefinition>) => {
    setGuides((current) => current.map((guide) => (guide.id === id ? { ...guide, ...updates } : guide)))
  }, [])

  const removeGuide = useCallback((id: string) => {
    setGuides((current) => current.filter((guide) => guide.id !== id))
  }, [])

  const handleCreateGuide = useCallback(
    (orientation: "horizontal" | "vertical") => {
      const value = window.prompt("Position du repère (px)")
      if (!value) return
      const numeric = Number(value)
      if (Number.isNaN(numeric)) {
        toast.error("Position invalide")
        return
      }
      addGuide({
        id: nanoid(),
        position: snapCoordinate(numeric),
        orientation,
        color: orientation === "horizontal" ? "#3B82F6" : "#F97316",
        opacity: 0.5,
        label: orientation === "horizontal" ? "Repère H" : "Repère V",
      })
    },
    [addGuide, snapCoordinate],
  )

  const handleGuidePointerDown = useCallback(
    (guide: GuideDefinition, event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const move = (e: PointerEvent) => {
        if (guide.orientation === "horizontal") {
          const relative = (e.clientY - canvasRect.top) / zoom
          updateGuide(guide.id, { position: Math.max(snapCoordinate(relative), 0) })
        } else {
          const relative = (e.clientX - canvasRect.left) / zoom
          updateGuide(guide.id, { position: Math.max(snapCoordinate(relative), 0) })
        }
      }

      const up = () => {
        document.removeEventListener("pointermove", move)
        document.removeEventListener("pointerup", up)
      }

      document.addEventListener("pointermove", move)
      document.addEventListener("pointerup", up)
    },
    [snapCoordinate, updateGuide, zoom],
  )

  const handleFitToPage = useCallback(() => {
    const canvas = canvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !viewport) return

    const canvasRect = canvas.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    if (canvasRect.width === 0 || canvasRect.height === 0) return

    const widthRatio = viewportRect.width / canvasRect.width
    const heightRatio = viewportRect.height / canvasRect.height
    const fit = Math.max(0.1, Math.min(widthRatio, heightRatio) * 0.95)
    setZoom(Number(fit.toFixed(2)))
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" })
  }, [])

  const contextValue = useMemo(
    () => ({
      zoom,
      setZoom,
      previewMode,
      setPreviewMode,
      showGrid,
      toggleGrid: () => setShowGrid((value) => !value),
      snapToGrid,
      toggleSnapToGrid: () => setSnapToGrid((value) => !value),
      gridSize,
      setGridSize,
      gridColor,
      setGridColor,
      gridOpacity,
      setGridOpacity,
      showGuides,
      toggleGuides: () => setShowGuides((value) => !value),
      guides,
      addGuide,
      updateGuide,
      removeGuide,
      cvData,
      canvasElement,
      setCanvasElement,
      tokens,
      tokenSource,
      theme,
      setTheme,
      adminFields: runtime.fields,
      adminRuntimeVersion: runtime.version,
      adminSchema: runtime.schema,
      registerNodeElement,
      unregisterNodeElement,
      snapPreview: snapPreviewState,
      setSnapPreview,
      clearSnapPreview,
      snapIndicators,
      setSnapIndicators,
      snapManager: snapManagerRef.current,
      paginationWarnings,
      setPaginationWarnings,
      runPagination: computePagination,
      fitToPage: handleFitToPage,
      viewportRef,
      isShiftPressed,
    }),
    [
      zoom,
      previewMode,
      showGrid,
      snapToGrid,
      gridSize,
      gridColor,
      gridOpacity,
      showGuides,
      guides,
      addGuide,
      updateGuide,
      removeGuide,
      cvData,
      theme,
      tokens,
      tokenSource,
      runtime,
      registerNodeElement,
      unregisterNodeElement,
      snapPreviewState,
      setSnapPreview,
      clearSnapPreview,
      snapIndicators,
      setSnapIndicators,
      snapManagerRef,
      paginationWarnings,
      computePagination,
      handleFitToPage,
      viewportRef,
      isShiftPressed,
    ],
  )

  useEffect(() => {
    const result = validateAdmin(cvData.admin ?? {})
    if (!result.success && result.errors.length > 0) {
      toast.warning("Champs personnalisés à valider", {
        description: result.errors.join("\n"),
      })
    }
  }, [runtime.version, validateAdmin, cvData])

  const zoomPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <Editor
      resolver={{
        Container,
        TextNode,
        ImageNode,
        VariableTextNode,
        RichTextNode,
        PageNode,
        SectionNode,
        StackNode,
        GridNode,
        BadgeNode,
        RatingNode,
        ShapeNode,
        RepeatNode,
      }}
    >
      <TemplateEditorContext.Provider value={contextValue}>
        <div className="flex h-screen flex-col">
          <EditorHeader
            cvName={cvName}
            onSave={handleSave}
            isSaving={isSaving}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />

          <div className="flex flex-1 overflow-hidden">
            <aside className="w-72 border-r bg-background/95 p-4">
              <Toolbox onAddGuide={handleCreateGuide} />
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
              <CanvasToolbar
                zoom={zoom}
                setZoom={setZoom}
                zoomPresets={zoomPresets}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                showGuides={showGuides}
                setShowGuides={setShowGuides}
                theme={theme}
                setTheme={setTheme}
                onCreateGuide={handleCreateGuide}
                onOpenSettings={() => setLayoutDialogOpen(true)}
                fitToPage={handleFitToPage}
              />

              <Dialog open={layoutDialogOpen} onOpenChange={setLayoutDialogOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Grille et repères</DialogTitle>
                    <DialogDescription>
                      Ajustez la densité de la grille, ses couleurs et gérez précisément chaque repère posé sur le canvas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="grid-size">Pas de la grille (px)</Label>
                            <Input
                              id="grid-size"
                              type="number"
                              min={4}
                              max={400}
                              step={2}
                              value={gridSize}
                              onChange={(event) => {
                                const value = Number.parseInt(event.target.value, 10)
                                setGridSize(Number.isFinite(value) && value > 0 ? value : 40)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="grid-color">Couleur de la grille</Label>
                            <Input
                              id="grid-color"
                              type="color"
                              value={gridColor}
                              onChange={(event) => setGridColor(event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="grid-opacity">Opacité (%)</Label>
                            <Input
                              id="grid-opacity"
                              type="number"
                              min={0}
                              max={100}
                              step={5}
                              value={Math.round(gridOpacity * 100)}
                              onChange={(event) => {
                                const value = Number.parseFloat(event.target.value)
                                const normalized = Number.isFinite(value) ? value / 100 : 0.08
                                setGridOpacity(Math.min(Math.max(normalized, 0), 1))
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold">Repères</h4>
                              <p className="text-xs text-muted-foreground">
                                Double-cliquez sur un repère pour le supprimer, ou éditez ses propriétés ci-dessous.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {guides.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Aucun repère n'a encore été créé.
                              </p>
                            )}
                            {guides.map((guide) => (
                              <div
                                key={guide.id}
                                className="grid gap-3 rounded-md border border-dashed border-border/60 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                              >
                                <div className="space-y-1">
                                  <Label htmlFor={`guide-label-${guide.id}`}>Nom</Label>
                                  <Input
                                    id={`guide-label-${guide.id}`}
                                    value={guide.label ?? ""}
                                    onChange={(event) =>
                                      updateGuide(guide.id, {
                                        label: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`guide-position-${guide.id}`}>
                                    Position {guide.orientation === "horizontal" ? "(Y)" : "(X)"}
                                  </Label>
                                  <Input
                                    id={`guide-position-${guide.id}`}
                                    type="number"
                                    value={Math.round(guide.position)}
                                    onChange={(event) => {
                                      const value = Number.parseFloat(event.target.value)
                                      updateGuide(guide.id, {
                                        position: Math.max(snapCoordinate(Number.isFinite(value) ? value : guide.position), 0),
                                      })
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`guide-color-${guide.id}`}>Couleur</Label>
                                  <Input
                                    id={`guide-color-${guide.id}`}
                                    type="color"
                                    value={guide.color}
                                    onChange={(event) => updateGuide(guide.id, { color: event.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`guide-opacity-${guide.id}`}>Opacité (%)</Label>
                                  <Input
                                    id={`guide-opacity-${guide.id}`}
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={Math.round((guide.opacity ?? 1) * 100)}
                                    onChange={(event) => {
                                      const value = Number.parseFloat(event.target.value)
                                      const normalized = Number.isFinite(value) ? value / 100 : guide.opacity
                                      updateGuide(guide.id, {
                                        opacity: Math.min(Math.max(normalized ?? 0.5, 0), 1),
                                      })
                                    }}
                                  />
                                </div>
                                <div className="flex items-end justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeGuide(guide.id)}
                                    aria-label="Supprimer le repère"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={previewMode} onValueChange={(value: PreviewMode) => setPreviewMode(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="web">Web viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                ref={viewportRef}
                className={cn(
                  "relative flex-1 overflow-auto",
                  isSpacePressed ? "cursor-grab" : "",
                  isPanning ? "cursor-grabbing" : "",
                )}
                data-editor-theme={theme}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
              >
                <div
                  ref={(node) => {
                    canvasRef.current = node
                    setCanvasElement(node)
                  }}
                  className="relative mx-auto flex w-full justify-center pb-32 pt-12"
                  style={{
                    backgroundColor:
                      theme === "dark"
                        ? tokens.themes?.dark?.background ?? tokens.themes?.light?.background ?? "#f8fafc"
                        : tokens.themes?.light?.background ?? "#f8fafc",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top center",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <BindingProvider data={cvData}>
                      <Frame data={initialTree}>
                        {!initialTree && <DefaultTemplate />}
                      </Frame>
                    </BindingProvider>

                    <SnapIndicatorLayer />
                    <LassoSelectionOverlay />
                    <SnapSelectionHandles />

                    {showGrid && <GridOverlay />}

                    {showGuides &&
                      guides.map((guide) => (
                        <div
                          key={guide.id}
                          data-editor-guide
                          onPointerDown={(event) => handleGuidePointerDown(guide, event)}
                          onDoubleClick={() => removeGuide(guide.id)}
                          className={cn(
                            "absolute z-40 cursor-grab",
                            guide.orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
                          )}
                          style={
                            guide.orientation === "horizontal"
                              ? {
                                  top: guide.position,
                                  backgroundColor: guide.color,
                                  opacity: guide.opacity,
                                }
                              : {
                                  left: guide.position,
                                  backgroundColor: guide.color,
                                  opacity: guide.opacity,
                                }
                          }
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="w-[360px] border-l bg-background/95">
              <div className="h-[55%] overflow-auto border-b p-4">
                <h3 className="mb-4 font-semibold">Inspecteur</h3>
                <SettingsPanel />
              </div>
              <div className="h-[45%] overflow-auto p-4">
                <h3 className="mb-4 font-semibold">Calques & structure</h3>
                <Layers />
              </div>
            </aside>
          </div>
        </div>
        <GlobalAIAssistant />
      </TemplateEditorContext.Provider>
    </Editor>
  )
}

function GridOverlay() {
  const { gridSize, gridColor, gridOpacity } = useTemplateEditor()
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 40
  const color = hexToRgba(gridColor, gridOpacity)

  return (
    <div
      data-editor-grid
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  )
}

function SnapIndicatorLayer() {
  const { snapIndicators } = useTemplateEditor()

  if (snapIndicators.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {snapIndicators.map((indicator, index) => {
        const key = `${indicator.orientation}-${indicator.position}-${indicator.referenceId ?? index}-${indicator.source}`
        const colorClass =
          indicator.source === "guide"
            ? "bg-amber-400/70"
            : indicator.source === "grid"
            ? "bg-sky-500/60"
            : "bg-indigo-500/70"

        if (indicator.orientation === "vertical") {
          return (
            <div
              key={key}
              className={cn("absolute inset-y-0 w-px", colorClass)}
              style={{ left: indicator.position }}
            />
          )
        }

        return (
          <div
            key={key}
            className={cn("absolute inset-x-0 h-px", colorClass)}
            style={{ top: indicator.position }}
          />
        )
      })}
    </div>
  )
}

interface CanvasToolbarProps {
  zoom: number
  setZoom: (value: number | ((prev: number) => number)) => void
  zoomPresets: number[]
  showGrid: boolean
  setShowGrid: Dispatch<SetStateAction<boolean>>
  snapToGrid: boolean
  setSnapToGrid: Dispatch<SetStateAction<boolean>>
  showGuides: boolean
  setShowGuides: Dispatch<SetStateAction<boolean>>
  theme: "light" | "dark"
  setTheme: Dispatch<SetStateAction<"light" | "dark">>
  onCreateGuide: (orientation: "horizontal" | "vertical") => void
  onOpenSettings: () => void
  fitToPage: () => void
}

function CanvasToolbar({
  zoom,
  setZoom,
  zoomPresets,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  showGuides,
  setShowGuides,
  theme,
  setTheme,
  onCreateGuide,
  onOpenSettings,
  fitToPage,
}: CanvasToolbarProps) {
  const { actions, query } = useEditor((state, query) => ({
    selected: query.getEvent("selected").all(),
  }))
  const { isShiftPressed } = useTemplateEditor()
  const selected = query.getEvent("selected").all()
  const selectedNodes = useMemo(() => {
    return selected
      .map((id) => {
        const node = query.node(id).get()
        const custom = (node.data.custom as { locked?: boolean }) ?? {}
        return { id, locked: Boolean(custom.locked) }
      })
      .filter(Boolean)
  }, [query, selected])

  const hasSelection = selectedNodes.length > 0
  const allLocked = hasSelection && selectedNodes.every((node) => node.locked)
  const anyLocked = hasSelection && selectedNodes.some((node) => node.locked)

  const applyHistory = useCallback(
    (operation: () => void) => {
      const history = (actions as any).history
      if (history?.throttle) {
        history.throttle(operation)
      } else {
        operation()
      }
    },
    [actions],
  )

  const lockSelected = useCallback(() => {
    if (!hasSelection) return
    applyHistory(() => {
      selected.forEach((id) => {
        actions.setCustom(id, (custom: any) => {
          custom.locked = true
        })
      })
    })
  }, [actions, applyHistory, hasSelection, selected])

  const unlockSelected = useCallback(() => {
    if (!hasSelection) return
    applyHistory(() => {
      selected.forEach((id) => {
        actions.setCustom(id, (custom: any) => {
          custom.locked = false
        })
      })
    })
  }, [actions, applyHistory, hasSelection, selected])

  const duplicateSelected = useCallback(() => {
    if (!hasSelection) return

    applyHistory(() => {
      selected.forEach((id) => {
        const node = query.node(id)
        const instance = node.get()
        const parentId = instance.data.parent
        if (!parentId) return
        const tree: any = node.toNodeTree()
        if (!tree) return

        Object.values(tree.nodes ?? {}).forEach((treeNode: any) => {
          if (!treeNode.data.custom) {
            treeNode.data.custom = {}
          }
          const base = treeNode.data.custom.position ?? { x: 0, y: 0 }
          treeNode.data.custom.position = {
            x: Math.round((base.x ?? 0) + 24),
            y: Math.round((base.y ?? 0) + 24),
          }
          treeNode.data.custom.locked = false
        })

        try {
          actions.addNodeTree(tree, parentId)
        } catch (error) {
          console.error("Unable to duplicate node", error)
        }
      })
    })
  }, [actions, applyHistory, hasSelection, query, selected])

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return
      }

      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        fitToPage()
        return
      }

      if (hasSelection && (event.metaKey || event.ctrlKey)) {
        if (event.key.toLowerCase() === "l") {
          event.preventDefault()
          if (allLocked) {
            unlockSelected()
          } else {
            lockSelected()
          }
        }

        if (event.key.toLowerCase() === "d") {
          event.preventDefault()
          duplicateSelected()
        }
      }
    }

    window.addEventListener("keydown", handleShortcuts)
    return () => window.removeEventListener("keydown", handleShortcuts)
  }, [allLocked, duplicateSelected, fitToPage, hasSelection, lockSelected, unlockSelected])

  return (
    <div className="flex items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Select value={zoom.toString()} onValueChange={(value) => setZoom(Number(value))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {zoomPresets.map((preset) => (
              <SelectItem key={preset} value={preset.toString()}>
                {Math.round(preset * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoom((value) => Math.min(2, Number((value + 0.25).toFixed(2))))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={fitToPage}>
          <Focus className="mr-2 h-4 w-4" />
          Fit page
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant={showGrid ? "default" : "outline"} onClick={() => setShowGrid((value) => !value)}>
          <Grid2X2 className="mr-2 h-4 w-4" />
          Grille
        </Button>
        <Button size="sm" variant={snapToGrid ? "default" : "outline"} onClick={() => setSnapToGrid((value) => !value)}>
          <Magnet className="mr-2 h-4 w-4" />
          Magnétisme
        </Button>
        <Button size="sm" variant={showGuides ? "default" : "outline"} onClick={() => setShowGuides((value) => !value)}>
          <Ruler className="mr-2 h-4 w-4" />
          Repères
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}>
          {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
          {theme === "light" ? "Mode sombre" : "Mode clair"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onCreateGuide("horizontal")}>
          <Plus className="mr-2 h-4 w-4" />
          H
        </Button>
        <Button size="sm" variant="outline" onClick={() => onCreateGuide("vertical")}>
          <Plus className="mr-2 h-4 w-4" />
          V
        </Button>
        <Button
          size="sm"
          variant={isShiftPressed ? "default" : "outline"}
          className="hidden sm:inline-flex"
        >
          <Lasso className="mr-2 h-4 w-4" />
          Multi
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenSettings}>
          <Settings2 className="mr-2 h-4 w-4" />
          Paramètres
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={duplicateSelected} disabled={!hasSelection}>
          <CopyPlus className="mr-2 h-4 w-4" />
          Dupliquer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={allLocked ? unlockSelected : lockSelected}
          disabled={!hasSelection}
        >
          {allLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
          {allLocked ? "Déverrouiller" : anyLocked ? "Verrou partiel" : "Verrouiller"}
        </Button>
      </div>
    </div>
  )
}

function SnapSelectionHandles() {
  const {
    canvasElement,
    snapPreview,
    setSnapPreview,
    clearSnapPreview,
    setSnapIndicators,
    snapManager,
    zoom,
    snapToGrid,
    gridSize,
  } = useTemplateEditor()
  const {
    actions,
    query,
    selected,
  } = useEditor((state, query) => ({
    selected: query.getEvent("selected").all(),
  }))

  const selectionRects = useMemo(() => {
    if (!canvasElement) return []
    return selected
      .map((id) => {
        const node = query.node(id).get()
        const custom = (node.data.custom as { locked?: boolean }) ?? {}
        if (custom.locked) {
          return null
        }
        const element = node.dom as HTMLElement | null
        const rect = snapManager.getRelativeRect(element)
        if (!rect) return null
        const preview = snapPreview[id] ?? { x: 0, y: 0 }
        return {
          id,
          left: rect.left + preview.x,
          top: rect.top + preview.y,
          width: rect.width,
          height: rect.height,
        }
      })
      .filter((value): value is { id: string; left: number; top: number; width: number; height: number } => value !== null)
  }, [canvasElement, selected, query, snapManager, snapPreview])

  const dragStateRef = useRef<{
    anchorId: string
    anchorRect: NonNullable<ReturnType<SnapManager["getRelativeRect"]>>
    nodes: {
      id: string
      rect: NonNullable<ReturnType<SnapManager["getRelativeRect"]>>
      position: { x: number; y: number }
    }[]
    startPointer: { x: number; y: number }
    lastDelta: { x: number; y: number }
  } | null>(null)
  const moveListenerRef = useRef<((event: PointerEvent) => void) | null>(null)

  useEffect(() => {
    return () => {
      if (moveListenerRef.current) {
        window.removeEventListener("pointermove", moveListenerRef.current)
      }
    }
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, anchorId: string) => {
      if (selected.length === 0) return
      event.preventDefault()
      event.stopPropagation()

      const pointerStart = { x: event.clientX, y: event.clientY }
      const nodes = selected
        .map((id) => {
          const node = query.node(id).get()
          const custom = (node.data.custom as { locked?: boolean; position?: { x?: number; y?: number } }) ?? {}
          if (custom.locked) return null
          const element = node.dom as HTMLElement | null
          const rect = snapManager.getRelativeRect(element)
          if (!rect) return null
          const customPosition = custom.position
          return {
            id,
            rect,
            position: {
              x: Number(customPosition?.x ?? 0),
              y: Number(customPosition?.y ?? 0),
            },
          }
        })
        .filter(
          (value): value is {
            id: string
            rect: NonNullable<ReturnType<SnapManager["getRelativeRect"]>>
            position: { x: number; y: number }
          } => value !== null,
        )

      if (nodes.length === 0) return

      const anchor = nodes.find((node) => node.id === anchorId) ?? nodes[0]

      dragStateRef.current = {
        anchorId: anchor.id,
        anchorRect: anchor.rect,
        nodes,
        startPointer: pointerStart,
        lastDelta: { x: 0, y: 0 },
      }

      const handleMove = (evt: PointerEvent) => {
        if (!dragStateRef.current) return
        const zoomFactor = zoom > 0 ? zoom : 1
        const delta = {
          x: (evt.clientX - dragStateRef.current.startPointer.x) / zoomFactor,
          y: (evt.clientY - dragStateRef.current.startPointer.y) / zoomFactor,
        }
        const snap = snapManager.snapRect(dragStateRef.current.anchorId, dragStateRef.current.anchorRect, delta, {
          exclude: dragStateRef.current.nodes.map((node) => node.id),
        })
        dragStateRef.current.lastDelta = { x: snap.deltaX, y: snap.deltaY }
        const preview: Record<string, { x: number; y: number }> = {}
        dragStateRef.current.nodes.forEach((node) => {
          preview[node.id] = { x: snap.deltaX, y: snap.deltaY }
        })
        setSnapPreview(preview)
        setSnapIndicators(snap.indicators)
      }

      const handleUp = () => {
        if (!dragStateRef.current) return
        const delta = dragStateRef.current.lastDelta
        dragStateRef.current.nodes.forEach((node) => {
          const nextX = Math.round(node.position.x + delta.x)
          const nextY = Math.round(node.position.y + delta.y)
          actions.setCustom(node.id, (custom: any) => {
            const existing = custom?.position ?? { x: 0, y: 0 }
            custom.position = { ...existing, x: nextX, y: nextY }
          })
        })
        clearSnapPreview()
        setSnapIndicators([])
        dragStateRef.current = null
        if (moveListenerRef.current) {
          window.removeEventListener("pointermove", moveListenerRef.current)
          moveListenerRef.current = null
        }
        window.removeEventListener("pointerup", handleUp)
      }

      moveListenerRef.current = handleMove
      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [actions, clearSnapPreview, query, selected, setSnapIndicators, setSnapPreview, snapManager, zoom],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selected.length === 0) return
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return
      }
      event.preventDefault()

      const baseStep = event.shiftKey ? Math.max(1, gridSize) : 1
      const delta = { x: 0, y: 0 }
      switch (event.key) {
        case "ArrowLeft":
          delta.x = -baseStep
          break
        case "ArrowRight":
          delta.x = baseStep
          break
        case "ArrowUp":
          delta.y = -baseStep
          break
        case "ArrowDown":
          delta.y = baseStep
          break
        default:
          break
      }

      let finalDelta = delta
      if (snapToGrid && event.shiftKey) {
        const anchorId = selected[0]
        const anchorNode = query.node(anchorId).get()
        const element = anchorNode.dom as HTMLElement | null
        const rect = snapManager.getRelativeRect(element)
        if (rect) {
          const snap = snapManager.snapRect(anchorId, rect, delta, { exclude: selected })
          finalDelta = { x: snap.deltaX, y: snap.deltaY }
        }
      }

      selected.forEach((id) => {
        const node = query.node(id).get()
        const custom = (node.data.custom as { locked?: boolean; position?: { x?: number; y?: number } }) ?? {}
        if (custom.locked) return
        const current = custom.position ?? { x: 0, y: 0 }
        actions.setCustom(id, (custom: any) => {
          const existing = custom?.position ?? { x: 0, y: 0 }
          custom.position = {
            ...existing,
            x: Math.round(Number(current.x ?? 0) + finalDelta.x),
            y: Math.round(Number(current.y ?? 0) + finalDelta.y),
          }
        })
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [actions, gridSize, query, selected, snapManager, snapToGrid])

  if (!canvasElement || selectionRects.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {selectionRects.map((rect) => (
        <div
          key={rect.id}
          className="pointer-events-none absolute rounded border border-indigo-500/60"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          <button
            type="button"
            className="pointer-events-auto absolute -left-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-indigo-500 text-[10px] font-semibold text-background shadow focus:outline-none"
            onPointerDown={(event) => handlePointerDown(event, rect.id)}
            aria-label="Déplacer le bloc"
          >
            ⠿
          </button>
        </div>
      ))}
    </div>
  )
}

function LassoSelectionOverlay() {
  const { canvasElement, snapManager, zoom, isShiftPressed } = useTemplateEditor()
  const { actions, query } = useEditor((state, query) => ({
    selected: query.getEvent("selected").all(),
  }))
  const [lassoRect, setLassoRect] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const reset = useCallback(() => {
    setLassoRect(null)
    startRef.current = null
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canvasElement) return
      if (!isShiftPressed) return
      if (event.button !== 0) return

      const rect = canvasElement.getBoundingClientRect()
      const safeZoom = zoom > 0 ? zoom : 1
      const origin = {
        x: (event.clientX - rect.left) / safeZoom,
        y: (event.clientY - rect.top) / safeZoom,
      }

      startRef.current = origin
      setLassoRect({ left: origin.x, top: origin.y, width: 0, height: 0 })
      event.preventDefault()
      ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    },
    [canvasElement, isShiftPressed, zoom],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canvasElement) return
      if (!startRef.current) return
      const rect = canvasElement.getBoundingClientRect()
      const safeZoom = zoom > 0 ? zoom : 1
      const current = {
        x: (event.clientX - rect.left) / safeZoom,
        y: (event.clientY - rect.top) / safeZoom,
      }
      const left = Math.min(startRef.current.x, current.x)
      const top = Math.min(startRef.current.y, current.y)
      const width = Math.abs(current.x - startRef.current.x)
      const height = Math.abs(current.y - startRef.current.y)
      setLassoRect({ left, top, width, height })
    },
    [canvasElement, zoom],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canvasElement) {
        reset()
        return
      }
      if (!startRef.current) {
        reset()
        return
      }

      const zone = lassoRect
      reset()
      ;(event.target as HTMLElement).releasePointerCapture?.(event.pointerId)
      if (!zone) {
        return
      }

      const elements = snapManager.listRegisteredRects()
      const selectedIds = elements
        .filter((entry) => {
          const rect = entry.rect
          const intersects =
            rect.left < zone.left + zone.width &&
            rect.left + rect.width > zone.left &&
            rect.top < zone.top + zone.height &&
            rect.top + rect.height > zone.top
          if (!intersects) return false
          const node = query.node(entry.id).get()
          const custom = (node.data.custom as { locked?: boolean }) ?? {}
          return !custom.locked
        })
        .map((entry) => entry.id)

      const base = query.getEvent("selected").all()
      const merged = isShiftPressed ? Array.from(new Set([...base, ...selectedIds])) : selectedIds
      const craftActions = actions as any
      if (typeof craftActions.setSelected === "function") {
        craftActions.setSelected(merged)
      } else if (merged.length > 0 && typeof craftActions.selectNode === "function") {
        craftActions.selectNode(merged[0])
        merged.slice(1).forEach((id: string) => {
          craftActions.selectNode(id)
        })
      }
    },
    [actions, isShiftPressed, lassoRect, query, reset, snapManager],
  )

  if (!canvasElement) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ pointerEvents: isShiftPressed ? "auto" : "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {lassoRect && (
        <div
          className="absolute rounded border border-dashed border-indigo-500/70 bg-indigo-500/10"
          style={{
            left: lassoRect.left,
            top: lassoRect.top,
            width: lassoRect.width,
            height: lassoRect.height,
          }}
        />
      )}
    </div>
  )
}

function DefaultTemplate() {
  return (
    <Element is={PageNode} canvas>
      <Element is={SectionNode} canvas title="Profil" padding={32} gap={16}>
        <Element is={TextNode} text="Votre Nom" fontSize={32} fontWeight="700" />
        <Element is={TextNode} text="Titre du poste" fontSize={18} color="#4B5563" />
        <Element
          is={RichTextNode}
          minHeight={120}
          content={[{ type: "paragraph", children: [{ text: "Décrivez votre parcours..." }] }]}
        />
      </Element>
      <Element is={SectionNode} canvas title="Expériences" padding={32} gap={24}>
        <Element is={StackNode} canvas gap={12}>
          <Element is={TextNode} text="Entreprise" fontSize={18} fontWeight="600" />
          <Element
            is={TextNode}
            text="Décrivez les missions réalisées, résultats obtenus et technologies utilisées."
            fontSize={14}
            color="#4B5563"
          />
        </Element>
      </Element>
    </Element>
  )
}

function hexToRgba(hex: string, opacity: number) {
  let sanitized = hex.replace("#", "")
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((char) => char + char)
      .join("")
  }

  const alpha = Number.isFinite(opacity) ? Math.min(Math.max(opacity, 0), 1) : 0.08
  const value = Number.parseInt(sanitized, 16)
  if (Number.isNaN(value)) {
    return `rgba(99, 102, 241, ${alpha})`
  }
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

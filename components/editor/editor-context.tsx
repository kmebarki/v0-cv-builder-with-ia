"use client"

import { createContext, useContext, type RefObject } from "react"
import type { DesignTokenDefinition } from "@/lib/editor/design-tokens-store"
import type { AdminFieldDefinition } from "@/lib/editor/admin-fields"
import type { AdminFieldRuntimeSnapshot } from "@/lib/editor/admin-field-runtime"
import type { SnapIndicator } from "@/components/editor/snap-manager"
import type { SnapManager } from "@/components/editor/snap-manager"
import type { PaginationResult, PaginationWarning } from "@/lib/editor/pagination-engine"

export type PreviewMode = "a4" | "mobile" | "web"

export interface GuideDefinition {
  id: string
  position: number
  orientation: "horizontal" | "vertical"
  color: string
  opacity: number
  label?: string
}

export interface TemplateEditorContextValue {
  zoom: number
  setZoom: (zoom: number) => void
  previewMode: PreviewMode
  setPreviewMode: (mode: PreviewMode) => void
  showGrid: boolean
  toggleGrid: () => void
  snapToGrid: boolean
  toggleSnapToGrid: () => void
  gridSize: number
  setGridSize: (size: number) => void
  gridColor: string
  setGridColor: (color: string) => void
  gridOpacity: number
  setGridOpacity: (opacity: number) => void
  showGuides: boolean
  toggleGuides: () => void
  guides: GuideDefinition[]
  addGuide: (guide: GuideDefinition) => void
  updateGuide: (id: string, updates: Partial<GuideDefinition>) => void
  removeGuide: (id: string) => void
  cvData: any
  canvasElement: HTMLDivElement | null
  setCanvasElement: (element: HTMLDivElement | null) => void
  tokens: DesignTokenDefinition
  tokenSource?: string
  theme: "light" | "dark"
  setTheme: (theme: "light" | "dark") => void
  adminFields: AdminFieldDefinition[]
  adminRuntimeVersion: number
  adminSchema: AdminFieldRuntimeSnapshot["schema"]
  registerNodeElement: (id: string, element: HTMLElement) => void
  unregisterNodeElement: (id: string) => void
  snapPreview: Record<string, { x: number; y: number }>
  setSnapPreview: (preview: Record<string, { x: number; y: number }>) => void
  clearSnapPreview: () => void
  snapIndicators: SnapIndicator[]
  setSnapIndicators: (indicators: SnapIndicator[]) => void
  snapManager: SnapManager
  paginationWarnings: PaginationWarning[]
  setPaginationWarnings: (warnings: PaginationWarning[]) => void
  runPagination: () => PaginationResult | null
  fitToPage: () => void
  viewportRef: RefObject<HTMLDivElement | null>
  isShiftPressed: boolean
}

const TemplateEditorContext = createContext<TemplateEditorContextValue | null>(null)

export function useTemplateEditor() {
  const ctx = useContext(TemplateEditorContext)
  if (!ctx) {
    throw new Error("useTemplateEditor must be used within a TemplateEditorProvider")
  }
  return ctx
}

export { TemplateEditorContext }

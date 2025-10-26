import type { GuideDefinition } from "@/components/editor/editor-context"

export type SnapSource = "grid" | "guide" | "edge" | "center"

export interface SnapIndicator {
  orientation: "horizontal" | "vertical"
  position: number
  source: SnapSource
  referenceId?: string
}

export interface SnapDelta {
  x: number
  y: number
}

interface SnapRect {
  left: number
  top: number
  width: number
  height: number
}

interface SnapCandidate {
  value: number
  indicator: SnapIndicator
}

interface SnapConfig {
  canvas: HTMLDivElement | null
  gridSize: number
  guides: GuideDefinition[]
  snapEnabled: boolean
  zoom: number
}

interface SnapOptions {
  exclude?: string[]
}

export interface SnapResult {
  left: number
  top: number
  deltaX: number
  deltaY: number
  indicators: SnapIndicator[]
}

const SNAP_THRESHOLD = 8

export class SnapManager {
  private config: SnapConfig
  private readonly elements: Map<string, HTMLElement>

  constructor(initialConfig: SnapConfig) {
    this.config = initialConfig
    this.elements = new Map()
  }

  updateConfig(partial: Partial<SnapConfig>) {
    this.config = { ...this.config, ...partial }
  }

  registerElement(id: string, element: HTMLElement) {
    this.elements.set(id, element)
  }

  unregisterElement(id: string) {
    this.elements.delete(id)
  }

  getRelativeRect(element: HTMLElement | null): SnapRect | null {
    if (!element) return null
    const { canvas, zoom } = this.config
    if (!canvas) return null
    const canvasRect = canvas.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const safeZoom = zoom > 0 ? zoom : 1
    return {
      left: (rect.left - canvasRect.left) / safeZoom,
      top: (rect.top - canvasRect.top) / safeZoom,
      width: rect.width / safeZoom,
      height: rect.height / safeZoom,
    }
  }

  snapRect(id: string, rect: SnapRect, delta: SnapDelta, options?: SnapOptions): SnapResult {
    const { snapEnabled } = this.config
    const rawLeft = rect.left + delta.x
    const rawTop = rect.top + delta.y

    if (!snapEnabled) {
      return {
        left: rawLeft,
        top: rawTop,
        deltaX: rawLeft - rect.left,
        deltaY: rawTop - rect.top,
        indicators: [],
      }
    }

    const indicators: SnapIndicator[] = []
    const vertical = this.collectVerticalCandidates(id, rect, rawLeft, options)
    const horizontal = this.collectHorizontalCandidates(id, rect, rawTop, options)

    const snappedLeft = Math.max(0, this.chooseClosest(rawLeft, vertical, indicators))
    const snappedTop = Math.max(0, this.chooseClosest(rawTop, horizontal, indicators))

    return {
      left: snappedLeft,
      top: snappedTop,
      deltaX: snappedLeft - rect.left,
      deltaY: snappedTop - rect.top,
      indicators,
    }
  }

  listRegisteredRects(): { id: string; rect: SnapRect }[] {
    const output: { id: string; rect: SnapRect }[] = []
    for (const [id, element] of this.elements.entries()) {
      if (!element.isConnected) continue
      const rect = this.getRelativeRect(element)
      if (!rect) continue
      output.push({ id, rect })
    }
    return output
  }

  private collectVerticalCandidates(id: string, rect: SnapRect, targetLeft: number, options?: SnapOptions): SnapCandidate[] {
    const candidates: SnapCandidate[] = []
    const { gridSize, guides } = this.config
    const exclude = new Set(options?.exclude ?? [])
    exclude.add(id)

    if (gridSize > 0) {
      const aligned = Math.round(targetLeft / gridSize) * gridSize
      candidates.push({
        value: aligned,
        indicator: { orientation: "vertical", position: aligned, source: "grid" },
      })
    }

    for (const guide of guides) {
      if (guide.orientation !== "vertical") continue
      candidates.push({
        value: guide.position,
        indicator: { orientation: "vertical", position: guide.position, source: "guide", referenceId: guide.id },
      })
      candidates.push({
        value: guide.position - rect.width / 2,
        indicator: { orientation: "vertical", position: guide.position, source: "guide", referenceId: guide.id },
      })
    }

    for (const [elementId, element] of this.elements.entries()) {
      if (exclude.has(elementId)) continue
      if (!element.isConnected) continue
      const elementRect = this.getRelativeRect(element)
      if (!elementRect) continue
      const left = elementRect.left
      const right = elementRect.left + elementRect.width
      const center = left + elementRect.width / 2
      candidates.push({
        value: left,
        indicator: { orientation: "vertical", position: left, source: "edge", referenceId: elementId },
      })
      candidates.push({
        value: right - rect.width,
        indicator: { orientation: "vertical", position: right, source: "edge", referenceId: elementId },
      })
      candidates.push({
        value: center - rect.width / 2,
        indicator: { orientation: "vertical", position: center, source: "center", referenceId: elementId },
      })
    }

    return candidates
  }

  private collectHorizontalCandidates(id: string, rect: SnapRect, targetTop: number, options?: SnapOptions): SnapCandidate[] {
    const candidates: SnapCandidate[] = []
    const { gridSize, guides } = this.config
    const exclude = new Set(options?.exclude ?? [])
    exclude.add(id)

    if (gridSize > 0) {
      const aligned = Math.round(targetTop / gridSize) * gridSize
      candidates.push({
        value: aligned,
        indicator: { orientation: "horizontal", position: aligned, source: "grid" },
      })
    }

    for (const guide of guides) {
      if (guide.orientation !== "horizontal") continue
      candidates.push({
        value: guide.position,
        indicator: { orientation: "horizontal", position: guide.position, source: "guide", referenceId: guide.id },
      })
      candidates.push({
        value: guide.position - rect.height / 2,
        indicator: { orientation: "horizontal", position: guide.position, source: "guide", referenceId: guide.id },
      })
    }

    for (const [elementId, element] of this.elements.entries()) {
      if (exclude.has(elementId)) continue
      if (!element.isConnected) continue
      const elementRect = this.getRelativeRect(element)
      if (!elementRect) continue
      const top = elementRect.top
      const bottom = elementRect.top + elementRect.height
      const middle = top + elementRect.height / 2
      candidates.push({
        value: top,
        indicator: { orientation: "horizontal", position: top, source: "edge", referenceId: elementId },
      })
      candidates.push({
        value: bottom - rect.height,
        indicator: { orientation: "horizontal", position: bottom, source: "edge", referenceId: elementId },
      })
      candidates.push({
        value: middle - rect.height / 2,
        indicator: { orientation: "horizontal", position: middle, source: "center", referenceId: elementId },
      })
    }

    return candidates
  }

  private chooseClosest(rawValue: number, candidates: SnapCandidate[], indicators: SnapIndicator[]): number {
    if (candidates.length === 0) {
      return rawValue
    }

    const threshold = SNAP_THRESHOLD / (this.config.zoom > 0 ? this.config.zoom : 1)
    let bestValue = rawValue
    let bestDistance = Number.POSITIVE_INFINITY
    let bestIndicator: SnapIndicator | null = null

    for (const candidate of candidates) {
      const target = candidate.value
      const distance = Math.abs(target - rawValue)
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance
        bestValue = target
        bestIndicator = candidate.indicator
      }
    }

    if (bestIndicator) {
      indicators.push(bestIndicator)
    }

    return bestValue
  }
}

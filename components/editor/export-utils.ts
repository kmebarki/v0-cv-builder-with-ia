import {
  extractPaginationDocument,
  PaginationEngine,
  renderPaginatedDocument,
} from "@/lib/editor/pagination-engine"

const REMOVABLE_ATTRIBUTES = [
  "contenteditable",
  "draggable",
  "data-node-id",
  "data-layer-id",
  "data-canvas",
  "data-type",
  "data-handle",
  "data-pagination-block",
  "data-pagination-root",
  "data-pagination-collection",
  "data-pagination-item",
  "data-pagination-group",
  "data-pagination-group-id",
  "data-pagination-node-id",
  "data-pagination-template-id",
  "data-pagination-break-before",
  "data-pagination-break-after",
  "data-pagination-keep-with-next",
  "data-pagination-allow-split",
  "data-pagination-orphans",
  "data-pagination-widows",
]

const REMOVABLE_SELECTORS = ["[data-editor-grid]", "[data-editor-guide]", "script", "style"]

export interface PrepareCanvasOptions {
  zoom?: number
}

export function prepareCanvasForExport(element: HTMLElement, options: PrepareCanvasOptions = {}) {
  const documentDefinition = extractPaginationDocument(element, { zoom: options.zoom })
  const engine = new PaginationEngine()
  const result = engine.compose(documentDefinition)
  const { container } = renderPaginatedDocument(result, documentDefinition)

  for (const selector of REMOVABLE_SELECTORS) {
    container.querySelectorAll(selector).forEach((node) => node.remove())
  }

  container.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement) {
      for (const attribute of REMOVABLE_ATTRIBUTES) {
        node.removeAttribute(attribute)
      }
    }
  })

  return {
    html: container.innerHTML,
    warnings: result.warnings,
    pages: result.pages,
  }
}

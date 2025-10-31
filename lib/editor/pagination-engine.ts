export type BreakBehavior = "auto" | "before" | "after" | "avoid"

type FlowItemType = "block" | "group"

type FlowRole = "block" | "item"

export interface PageTemplate {
  id: string
  element: HTMLElement
  width: number
  height: number
  contentWidth: number
  contentHeight: number
}

export interface FlowBlock {
  type: FlowItemType
  id?: string
  element: HTMLElement
  templateId: string
  height: number
  width: number
  breakBefore: BreakBehavior
  breakAfter: BreakBehavior
  keepWithNext: boolean
  allowSplit: boolean
  orphans: number
  widows: number
  groupId?: string
  role: FlowRole
}

export interface FlowGroup {
  type: FlowItemType
  id?: string
  element: HTMLElement
  templateId: string
  allowSplit: boolean
  orphans: number
  widows: number
  keepWithNext: boolean
  breakBefore: BreakBehavior
  breakAfter: BreakBehavior
  items: FlowBlock[]
}

export type FlowItem = FlowBlock | FlowGroup

export interface PaginationDocument {
  templates: PageTemplate[]
  flow: FlowItem[]
}

export interface PaginatedBlockEntry {
  type: "block"
  block: FlowBlock
}

export interface PaginatedGroupEntry {
  type: "group"
  group: FlowGroup
  itemStart: number
  itemEnd: number
}

export type PaginatedEntry = PaginatedBlockEntry | PaginatedGroupEntry

export interface PaginatedPage {
  templateId: string
  height: number
  width: number
  entries: PaginatedEntry[]
}

export type PaginationWarningType =
  | "block-oversized"
  | "group-oversized"
  | "orphans-adjusted"
  | "widows-adjusted"
  | "unplaced"

export interface PaginationWarning {
  type: PaginationWarningType
  message: string
  nodeId?: string
  groupId?: string
}

export interface PaginationResult {
  pages: PaginatedPage[]
  warnings: PaginationWarning[]
}

export interface ExtractPaginationOptions {
  zoom?: number
}

const DEFAULT_TEMPLATE_ID_PREFIX = "page-template"

const NUMBER_REGEX = /-?\d+(?:\.\d+)?/

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  if (!NUMBER_REGEX.test(value)) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback
  if (value === "" || value === "true") return true
  if (value === "false") return false
  return fallback
}

function readBreak(value: string | undefined, fallback: BreakBehavior = "auto"): BreakBehavior {
  if (!value) return fallback
  if (value === "before" || value === "after" || value === "avoid" || value === "auto") {
    return value
  }
  return fallback
}

function ensurePositive(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

function collectTemplates(root: HTMLElement, zoom: number): PageTemplate[] {
  const pageElements = Array.from(root.querySelectorAll<HTMLElement>("[data-template-page]"))
  return pageElements.map((element, index) => {
    const rect = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    const paddingTop = parseNumber(computed.paddingTop, 0)
    const paddingBottom = parseNumber(computed.paddingBottom, 0)
    const paddingLeft = parseNumber(computed.paddingLeft, 0)
    const paddingRight = parseNumber(computed.paddingRight, 0)
    const zoomFactor = zoom > 0 ? zoom : 1

    const width = rect.width / zoomFactor
    const height = rect.height / zoomFactor
    const contentWidth = Math.max(width - paddingLeft - paddingRight, 0)
    const contentHeight = Math.max(height - paddingTop - paddingBottom, 0)

    const id = element.getAttribute("data-pagination-template-id") ?? `${DEFAULT_TEMPLATE_ID_PREFIX}-${index}`

    return {
      id,
      element,
      width,
      height,
      contentWidth,
      contentHeight,
    }
  })
}

function isDirectCollectionItem(item: HTMLElement, collection: HTMLElement): boolean {
  const parentCollection = item.closest<HTMLElement>("[data-pagination-collection]")
  return parentCollection === collection
}

function createBlockFromElement(element: HTMLElement, templateId: string, zoom: number): FlowBlock {
  const rect = element.getBoundingClientRect()
  const zoomFactor = zoom > 0 ? zoom : 1
  const height = rect.height / zoomFactor
  const width = rect.width / zoomFactor

  return {
    type: "block",
    id: element.getAttribute("data-pagination-node-id") ?? undefined,
    element,
    templateId,
    height: ensurePositive(height),
    width: ensurePositive(width),
    breakBefore: readBreak(element.getAttribute("data-pagination-break-before")),
    breakAfter: readBreak(element.getAttribute("data-pagination-break-after")),
    keepWithNext: readBoolean(element.getAttribute("data-pagination-keep-with-next"), false),
    allowSplit: readBoolean(element.getAttribute("data-pagination-allow-split"), true),
    orphans: parseNumber(element.getAttribute("data-pagination-orphans"), 0),
    widows: parseNumber(element.getAttribute("data-pagination-widows"), 0),
    groupId: element.getAttribute("data-pagination-group") ?? undefined,
    role: readBoolean(element.getAttribute("data-pagination-item"), false) ? "item" : "block",
  }
}

function collectGroup(element: HTMLElement, templateId: string, zoom: number): FlowGroup {
  const allowSplit = readBoolean(element.getAttribute("data-pagination-allow-split"), true)
  const orphans = parseNumber(element.getAttribute("data-pagination-orphans"), 0)
  const widows = parseNumber(element.getAttribute("data-pagination-widows"), 0)

  const rawItems = Array.from(element.querySelectorAll<HTMLElement>("[data-pagination-item]"))
  const items = rawItems
    .filter((item) => isDirectCollectionItem(item, element))
    .map((item) => createBlockFromElement(item, templateId, zoom))

  return {
    type: "group",
    id: element.getAttribute("data-pagination-node-id") ?? element.getAttribute("data-pagination-group-id") ?? undefined,
    element,
    templateId,
    allowSplit,
    orphans,
    widows,
    keepWithNext: readBoolean(element.getAttribute("data-pagination-keep-with-next"), false),
    breakBefore: readBreak(element.getAttribute("data-pagination-break-before")),
    breakAfter: readBreak(element.getAttribute("data-pagination-break-after")),
    items,
  }
}

function collectFlowItems(container: HTMLElement, templateId: string, zoom: number): FlowItem[] {
  const items: FlowItem[] = []
  const children = Array.from(container.children) as HTMLElement[]
  for (const child of children) {
    if (!(child instanceof HTMLElement)) continue

    if (child.hasAttribute("data-pagination-collection")) {
      items.push(collectGroup(child, templateId, zoom))
      continue
    }

    if (child.hasAttribute("data-pagination-block")) {
      items.push(createBlockFromElement(child, templateId, zoom))
      continue
    }

    items.push(...collectFlowItems(child, templateId, zoom))
  }
  return items
}

export function extractPaginationDocument(root: HTMLElement, options: ExtractPaginationOptions = {}): PaginationDocument {
  const zoom = options.zoom ?? 1
  const templates = collectTemplates(root, zoom)
  const templateByElement = new Map<HTMLElement, PageTemplate>()
  templates.forEach((template) => templateByElement.set(template.element, template))

  const flow: FlowItem[] = []
  for (const template of templates) {
    const items = collectFlowItems(template.element, template.id, zoom)
    flow.push(...items)
  }

  return { templates, flow }
}

function blockHeight(item: FlowBlock): number {
  return ensurePositive(item.height)
}

function groupTotalHeight(group: FlowGroup): number {
  return ensurePositive(group.items.reduce((total, item) => total + blockHeight(item), 0))
}

function minimalHeightForKeep(item: FlowItem): number {
  if (item.type === "block") {
    return blockHeight(item)
  }
  if (item.allowSplit) {
    return item.items.length > 0 ? blockHeight(item.items[0]) : 0
  }
  return groupTotalHeight(item)
}

interface WorkingPage {
  page: PaginatedPage
  template: PageTemplate
  remaining: number
}

function createWorkingPage(template: PageTemplate): WorkingPage {
  return {
    template,
    remaining: ensurePositive(template.contentHeight),
    page: {
      templateId: template.id,
      height: ensurePositive(template.contentHeight),
      width: ensurePositive(template.contentWidth),
      entries: [],
    },
  }
}

export class PaginationEngine {
  compose(document: PaginationDocument): PaginationResult {
    if (document.templates.length === 0) {
      return { pages: [], warnings: [] }
    }

    const templateMap = new Map<string, PageTemplate>()
    for (const template of document.templates) {
      templateMap.set(template.id, template)
    }

    const warnings: PaginationWarning[] = []
    const workingPages: WorkingPage[] = []

    const firstTemplate = templateMap.get(document.flow[0]?.templateId ?? document.templates[0].id) ?? document.templates[0]
    let currentPage = createWorkingPage(firstTemplate)
    workingPages.push(currentPage)

    const startNewPage = (template: PageTemplate) => {
      const nextPage = createWorkingPage(template)
      workingPages.push(nextPage)
      currentPage = nextPage
    }

    const ensureTemplate = (templateId: string) => {
      const template = templateMap.get(templateId) ?? firstTemplate
      if (currentPage.template.id !== template.id) {
        if (currentPage.page.entries.length === 0) {
          currentPage = createWorkingPage(template)
          if (workingPages.length > 0) {
            workingPages[workingPages.length - 1] = currentPage
          } else {
            workingPages.push(currentPage)
          }
        } else {
          startNewPage(template)
        }
      }
      return template
    }

    const applyBreakBefore = (item: FlowItem, template: PageTemplate) => {
      const height = item.type === "block" ? blockHeight(item) : groupTotalHeight(item)
      if (item.breakBefore === "before" && currentPage.page.entries.length > 0) {
        startNewPage(template)
        return
      }
      if (item.breakBefore === "avoid" && height > currentPage.remaining && currentPage.page.entries.length > 0) {
        startNewPage(template)
      }
    }

    const applyBreakAfter = (item: FlowItem, template: PageTemplate) => {
      if (item.breakAfter === "after") {
        startNewPage(template)
      }
    }

    const enforceKeepWithNext = (item: FlowItem, next: FlowItem | undefined, template: PageTemplate) => {
      if (!next) return
      if (item.keepWithNext) {
        const required = minimalHeightForKeep(item) + minimalHeightForKeep(next)
        if (required > currentPage.remaining && currentPage.page.entries.length > 0) {
          startNewPage(template)
        }
      }
    }

    const placeBlock = (block: FlowBlock, index: number) => {
      const template = ensureTemplate(block.templateId)
      applyBreakBefore(block, template)
      const nextItem = document.flow[index + 1]
      enforceKeepWithNext(block, nextItem, template)

      const height = blockHeight(block)
      if (height > template.contentHeight) {
        warnings.push({
          type: "block-oversized",
          message: "Bloc plus grand que la hauteur de page disponible.",
          nodeId: block.id,
        })
      }

      if (height > currentPage.remaining && currentPage.page.entries.length > 0) {
        startNewPage(template)
      }

      const adjustedHeight = Math.min(height, currentPage.remaining)
      currentPage.page.entries.push({ type: "block", block })
      currentPage.remaining = ensurePositive(currentPage.remaining - height)

      if (adjustedHeight <= 0 && currentPage.page.entries.length === 0) {
        warnings.push({
          type: "unplaced",
          message: "Bloc non placé correctement sur la page.",
          nodeId: block.id,
        })
      }

      applyBreakAfter(block, template)
    }

    const placeUnsplittableGroup = (group: FlowGroup, index: number) => {
      const template = ensureTemplate(group.templateId)
      applyBreakBefore(group, template)
      const nextItem = document.flow[index + 1]
      enforceKeepWithNext(group, nextItem, template)

      const totalHeight = groupTotalHeight(group)
      if (totalHeight > template.contentHeight) {
        warnings.push({
          type: "group-oversized",
          message: "Groupe trop grand pour une seule page.",
          groupId: group.id,
        })
        placeSplittableGroup({ ...group, allowSplit: true }, index)
        return
      }

      if (totalHeight > currentPage.remaining && currentPage.page.entries.length > 0) {
        startNewPage(template)
      }

      currentPage.page.entries.push({ type: "group", group, itemStart: 0, itemEnd: group.items.length })
      currentPage.remaining = ensurePositive(currentPage.remaining - totalHeight)

      applyBreakAfter(group, template)
    }

    const placeSplittableGroup = (group: FlowGroup, index: number) => {
      const template = ensureTemplate(group.templateId)
      applyBreakBefore(group, template)
      const nextItem = document.flow[index + 1]
      enforceKeepWithNext(group, nextItem, template)

      let start = 0
      while (start < group.items.length) {
        if (currentPage.remaining <= 0 && currentPage.page.entries.length > 0) {
          startNewPage(template)
        }

        let remaining = currentPage.remaining
        const placed: FlowBlock[] = []
        let consumed = 0
        let pointer = start

        while (pointer < group.items.length) {
          const item = group.items[pointer]
          const itemHeight = blockHeight(item)
          if (itemHeight > template.contentHeight) {
            warnings.push({
              type: "block-oversized",
              message: "Élément de collection plus grand qu'une page.",
              nodeId: item.id,
            })
          }

          if (placed.length === 0 && itemHeight > remaining && currentPage.page.entries.length > 0) {
            startNewPage(template)
            remaining = currentPage.remaining
            continue
          }

          if (placed.length > 0 && itemHeight > remaining) {
            break
          }

          if (item.keepWithNext && pointer + 1 < group.items.length) {
            const nextHeight = blockHeight(group.items[pointer + 1])
            if (itemHeight + nextHeight > remaining && currentPage.page.entries.length > 0) {
              startNewPage(template)
              remaining = currentPage.remaining
              continue
            }
          }

          placed.push(item)
          consumed += itemHeight
          remaining = ensurePositive(remaining - itemHeight)
          pointer += 1

          if (item.breakAfter === "after") {
            break
          }
        }

        if (placed.length === 0) {
          const forcedItem = group.items[start]
          placed.push(forcedItem)
          consumed = blockHeight(forcedItem)
          remaining = ensurePositive(template.contentHeight - consumed)
          pointer = start + 1
        }

        if (start > 0 && placed.length < group.orphans) {
          startNewPage(template)
          continue
        }

        const itemsRemaining = group.items.length - pointer
        if (itemsRemaining > 0 && itemsRemaining < group.widows) {
          const shortage = group.widows - itemsRemaining
          if (shortage < placed.length && placed.length - shortage >= group.orphans) {
            const retained = placed.slice(0, placed.length - shortage)
            const restored = placed.slice(placed.length - shortage)
            const restoredHeight = restored.reduce((total, item) => total + blockHeight(item), 0)
            consumed -= restoredHeight
            remaining = ensurePositive(template.contentHeight - consumed)
            pointer -= shortage
            warnings.push({
              type: "widows-adjusted",
              message: "Réajustement des éléments pour éviter les veuves.",
              groupId: group.id,
            })
            placed.length = retained.length
            placed.splice(0, retained.length, ...retained)
          } else {
            warnings.push({
              type: "widows-adjusted",
              message: "Impossible de satisfaire la règle des veuves pour la collection.",
              groupId: group.id,
            })
          }
        }

        const entry: PaginatedGroupEntry = {
          type: "group",
          group,
          itemStart: start,
          itemEnd: pointer,
        }
        currentPage.page.entries.push(entry)
        currentPage.remaining = remaining
        start = pointer

        if (start < group.items.length && currentPage.remaining <= 0) {
          startNewPage(template)
        }
      }

      applyBreakAfter(group, template)
    }

    const placeGroup = (group: FlowGroup, index: number) => {
      if (group.allowSplit) {
        placeSplittableGroup(group, index)
      } else {
        placeUnsplittableGroup(group, index)
      }
    }

    document.flow.forEach((item, index) => {
      if (item.type === "block") {
        placeBlock(item, index)
      } else {
        placeGroup(item, index)
      }
    })

    const pages = workingPages
      .filter((page) => page.page.entries.length > 0)
      .map((page) => page.page)

    return { pages, warnings }
  }
}

function copyComputedStyles(source: Element, target: Element) {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    return
  }
  const computed = window.getComputedStyle(source)
  const declarations = Array.from(computed)
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join("")
  target.setAttribute("style", declarations)

  const sourceChildren = Array.from(source.children)
  const targetChildren = Array.from(target.children)
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index]
    const targetChild = targetChildren[index]
    if (sourceChild && targetChild) {
      copyComputedStyles(sourceChild, targetChild)
    }
  }
}

export function renderPaginatedDocument(result: PaginationResult, document: PaginationDocument) {
  const templateMap = new Map(document.templates.map((template) => [template.id, template]))
  const container = document.createElement("div")

  for (const page of result.pages) {
    const template = templateMap.get(page.templateId)
    if (!template) continue

    const pageClone = template.element.cloneNode(false) as HTMLElement
    copyComputedStyles(template.element, pageClone)
    pageClone.innerHTML = ""

    for (const entry of page.entries) {
      if (entry.type === "block") {
        const clone = entry.block.element.cloneNode(true) as HTMLElement
        copyComputedStyles(entry.block.element, clone)
        pageClone.appendChild(clone)
        continue
      }

      const groupClone = entry.group.element.cloneNode(false) as HTMLElement
      copyComputedStyles(entry.group.element, groupClone)
      groupClone.innerHTML = ""
      for (let index = entry.itemStart; index < entry.itemEnd; index += 1) {
        const item = entry.group.items[index]
        const itemClone = item.element.cloneNode(true) as HTMLElement
        copyComputedStyles(item.element, itemClone)
        groupClone.appendChild(itemClone)
      }
      pageClone.appendChild(groupClone)
    }

    container.appendChild(pageClone)
  }

  return { container, html: container.innerHTML }
}

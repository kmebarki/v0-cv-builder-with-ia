import type { PaginationWarning } from "@/lib/editor/pagination-engine"

export type PlanOperationCategory = "pagination" | "style" | "logic"

export interface PlanNodeSnapshot {
  id: string
  type: string
  displayName?: string
  parentId?: string | null
  props: Record<string, any>
}

export interface PlanBuilderContext {
  getNode: (id: string) => PlanNodeSnapshot | null
  getParentOf: (id: string) => PlanNodeSnapshot | null
  resolveGroupOwner: (groupId: string) => PlanNodeSnapshot | null
}

export interface PlanOperation {
  id: string
  nodeId: string
  category: PlanOperationCategory
  label: string
  reason: string
  props: Record<string, any>
}

export interface PlanResult {
  summary: string
  operations: PlanOperation[]
}

export type PlanDiffStatus = "pending" | "applied" | "blocked"

export interface PlanDiffEntry {
  operation: PlanOperation
  status: PlanDiffStatus
  blockingProps?: string[]
  mismatches?: Record<string, { current: unknown; expected: unknown }>
}

const DEFAULT_ORPHANS = 2
const DEFAULT_WIDOWS = 2

function operationKey(nodeId: string, props: Record<string, any>): string {
  const sorted = Object.entries(props)
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .sort()
  return `${nodeId}:${sorted.join("|")}`
}

function ensureNode(context: PlanBuilderContext, id: string | undefined | null) {
  if (!id) return null
  try {
    return context.getNode(id) ?? null
  } catch (error) {
    console.warn("[ai-plan] unable to read node", id, error)
    return null
  }
}

function findAncestorWithProp(
  context: PlanBuilderContext,
  node: PlanNodeSnapshot | null,
  propNames: string[],
): PlanNodeSnapshot | null {
  let current = node
  while (current) {
    const hasProp = propNames.some((prop) => Object.prototype.hasOwnProperty.call(current.props, prop))
    if (hasProp) {
      return current
    }
    current = ensureNode(context, current.parentId ?? null)
  }
  return null
}

function resolveGroupNodeId(groupId: string | undefined): string | null {
  if (!groupId) return null
  const repeatMatch = /^repeat-(.+)$/.exec(groupId)
  if (repeatMatch) {
    return repeatMatch[1]
  }
  return null
}

export function buildPlanFromWarnings(
  warnings: PaginationWarning[],
  context: PlanBuilderContext,
): PlanResult {
  const map = new Map<string, PlanOperation>()

  const register = (operation: PlanOperation) => {
    const key = operationKey(operation.nodeId, operation.props)
    if (map.has(key)) {
      return
    }
    map.set(key, { ...operation, id: key })
  }

  for (const warning of warnings) {
    if (warning.type === "block-oversized" || warning.type === "unplaced") {
      const node = ensureNode(context, warning.nodeId)
      if (!node) continue
      const target = findAncestorWithProp(context, node, ["breakBefore", "pageBreak"])
      if (!target) continue

      if (Object.prototype.hasOwnProperty.call(target.props, "breakBefore")) {
        register({
          id: "",
          nodeId: target.id,
          category: "pagination",
          label: `Forcer un saut de page avant ${target.displayName ?? target.type}`,
          reason: warning.message,
          props: { breakBefore: "before" },
        })
        continue
      }

      if (Object.prototype.hasOwnProperty.call(target.props, "pageBreak")) {
        register({
          id: "",
          nodeId: target.id,
          category: "pagination",
          label: `Définir le comportement de page de ${target.displayName ?? target.type}`,
          reason: warning.message,
          props: { pageBreak: "before" },
        })
      }
      continue
    }

    if (warning.type === "group-oversized") {
      const ownerId = resolveGroupNodeId(warning.groupId)
      const owner = ensureNode(context, ownerId)
      if (!owner) continue
      if (!Object.prototype.hasOwnProperty.call(owner.props, "allowItemSplit")) continue
      if (owner.props.allowItemSplit === true) continue

      register({
        id: "",
        nodeId: owner.id,
        category: "pagination",
        label: `Autoriser la division des éléments pour ${owner.displayName ?? owner.type}`,
        reason: warning.message,
        props: { allowItemSplit: true },
      })
      continue
    }

    if (warning.type === "widows-adjusted") {
      const ownerId = resolveGroupNodeId(warning.groupId)
      const owner = ensureNode(context, ownerId)
      if (!owner) continue
      if (!Object.prototype.hasOwnProperty.call(owner.props, "widows")) continue
      const current = Number(owner.props.widows ?? 0)
      if (Number.isFinite(current) && current >= DEFAULT_WIDOWS) continue

      register({
        id: "",
        nodeId: owner.id,
        category: "pagination",
        label: `Augmenter la protection contre les veuves pour ${owner.displayName ?? owner.type}`,
        reason: warning.message,
        props: { widows: DEFAULT_WIDOWS },
      })
      continue
    }

    if (warning.type === "orphans-adjusted") {
      const ownerId = resolveGroupNodeId(warning.groupId)
      const owner = ensureNode(context, ownerId)
      if (!owner) continue
      if (!Object.prototype.hasOwnProperty.call(owner.props, "orphans")) continue
      const current = Number(owner.props.orphans ?? 0)
      if (Number.isFinite(current) && current >= DEFAULT_ORPHANS) continue

      register({
        id: "",
        nodeId: owner.id,
        category: "pagination",
        label: `Renforcer la règle des orphelines pour ${owner.displayName ?? owner.type}`,
        reason: warning.message,
        props: { orphans: DEFAULT_ORPHANS },
      })
      continue
    }
  }

  const operations = Array.from(map.values())
  const summary = operations.length
    ? `Plan IA généré : ${operations.length} action${operations.length > 1 ? "s" : ""} recommandée${
        operations.length > 1 ? "s" : ""
      } pour stabiliser la pagination.`
    : "Analyse IA : aucune action critique détectée, la pagination est stable."

  return { summary, operations }
}

export function diffPlanOperations(
  operations: PlanOperation[],
  context: PlanBuilderContext,
): PlanDiffEntry[] {
  return operations.map((operation) => {
    const node = ensureNode(context, operation.nodeId)
    if (!node) {
      return {
        operation,
        status: "blocked",
        blockingProps: Object.keys(operation.props),
      }
    }

    const blockingProps: string[] = []
    const mismatches: Record<string, { current: unknown; expected: unknown }> = {}
    let pending = false

    for (const [prop, expected] of Object.entries(operation.props)) {
      if (!Object.prototype.hasOwnProperty.call(node.props, prop)) {
        blockingProps.push(prop)
        continue
      }
      const current = node.props[prop]
      if (current === expected) {
        continue
      }
      mismatches[prop] = { current, expected }
      pending = true
    }

    if (blockingProps.length > 0) {
      return { operation, status: "blocked", blockingProps }
    }

    if (!pending && Object.keys(mismatches).length === 0) {
      return { operation, status: "applied" }
    }

    return { operation, status: "pending", mismatches }
  })
}

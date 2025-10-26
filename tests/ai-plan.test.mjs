import test from "node:test"
import assert from "node:assert/strict"

const aiPlanModulePromise = import("../lib/editor/ai-plan.ts")

const WARNING_BLOCK = {
  type: "block-oversized",
  message: "Bloc plus grand que la hauteur de page disponible.",
  nodeId: "stack-1",
}

const WARNING_GROUP = {
  type: "group-oversized",
  message: "Groupe trop grand pour une seule page.",
  groupId: "repeat-repeat-1",
}

const WARNING_WIDOWS = {
  type: "widows-adjusted",
  message: "Réajustement des éléments pour éviter les veuves.",
  groupId: "repeat-repeat-1",
}

const WARNING_ORPHANS = {
  type: "orphans-adjusted",
  message: "Réajustement des éléments pour éviter les orphelines.",
  groupId: "repeat-repeat-1",
}

function createContext() {
  const nodes = new Map([
    [
      "page-1",
      {
        id: "page-1",
        type: "PageNode",
        displayName: "Page",
        parentId: null,
        props: { pageBreak: "auto" },
      },
    ],
    [
      "section-1",
      {
        id: "section-1",
        type: "SectionNode",
        displayName: "Section",
        parentId: "page-1",
        props: { breakBefore: "auto", breakAfter: "auto" },
      },
    ],
    [
      "repeat-1",
      {
        id: "repeat-1",
        type: "RepeatNode",
        displayName: "Repeat",
        parentId: "section-1",
        props: { allowItemSplit: false, widows: 1, orphans: 1 },
      },
    ],
    [
      "stack-1",
      {
        id: "stack-1",
        type: "StackNode",
        displayName: "Stack",
        parentId: "section-1",
        props: { breakBefore: "auto" },
      },
    ],
  ])

  return {
    nodes,
    context: {
      getNode: (id) => nodes.get(id) ?? null,
      getParentOf: (id) => {
        const node = nodes.get(id)
        if (!node?.parentId) return null
        return nodes.get(node.parentId) ?? null
      },
      resolveGroupOwner: (groupId) => {
        const match = /^repeat-(.+)$/.exec(groupId)
        if (!match) return null
        return nodes.get(match[1]) ?? null
      },
    },
  }
}

test("buildPlanFromWarnings propose des opérations correctives", async () => {
  const { buildPlanFromWarnings } = await aiPlanModulePromise
  const { context } = createContext()

  const plan = buildPlanFromWarnings([
    WARNING_BLOCK,
    WARNING_GROUP,
    WARNING_WIDOWS,
    WARNING_ORPHANS,
  ], context)

  assert.equal(plan.operations.length, 4)
  const breakOp = plan.operations.find((operation) => operation.props.breakBefore === "before")
  assert.ok(breakOp, "une opération de saut de page est attendue")
  const splitOp = plan.operations.find((operation) => operation.props.allowItemSplit === true)
  assert.ok(splitOp, "une opération allowItemSplit doit être générée")
  const widowsOp = plan.operations.find((operation) => operation.props.widows === 2)
  assert.ok(widowsOp)
  const orphansOp = plan.operations.find((operation) => operation.props.orphans === 2)
  assert.ok(orphansOp)
  assert.ok(plan.summary.includes("Plan IA généré"))
})

test("diffPlanOperations marque les opérations comme pending puis applied", async () => {
  const { buildPlanFromWarnings, diffPlanOperations } = await aiPlanModulePromise
  const { nodes, context } = createContext()

  const plan = buildPlanFromWarnings([
    WARNING_BLOCK,
    WARNING_GROUP,
    WARNING_WIDOWS,
    WARNING_ORPHANS,
  ], context)

  const initialDiff = diffPlanOperations(plan.operations, context)
  assert.equal(
    initialDiff.every((entry) => entry.status === "pending"),
    true,
    "Toutes les opérations devraient être en attente initialement",
  )

  for (const operation of plan.operations) {
    const node = nodes.get(operation.nodeId)
    assert.ok(node)
    for (const [key, value] of Object.entries(operation.props)) {
      node.props[key] = value
    }
  }

  const appliedDiff = diffPlanOperations(plan.operations, context)
  assert.equal(
    appliedDiff.every((entry) => entry.status === "applied"),
    true,
    "Toutes les opérations devraient être marquées comme appliquées",
  )
})

test("diffPlanOperations signale les opérations bloquées", async () => {
  const { diffPlanOperations } = await aiPlanModulePromise
  const { context } = createContext()

  const diff = diffPlanOperations(
    [
      {
        id: "custom",
        nodeId: "stack-1",
        category: "pagination",
        label: "Essai",
        reason: "Prop inexistante",
        props: { imaginaryProp: true },
      },
    ],
    context,
  )

  assert.equal(diff.length, 1)
  assert.equal(diff[0].status, "blocked")
  assert.deepEqual(diff[0].blockingProps, ["imaginaryProp"])
})

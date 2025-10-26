"use client"

import { useMemo } from "react"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface GridNodeProps {
  columns?: number
  rows?: number
  gap?: number | string
  align?: "start" | "center" | "end" | "stretch"
  autoFlow?: "row" | "column" | "dense"
}

const alignItemsMap: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
}

export function GridNode({
  columns = 2,
  rows = 1,
  gap = "spacing.md",
  align = "stretch",
  autoFlow = "row",
  children,
}: React.PropsWithChildren<GridNodeProps>) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const gapValue = useTokenValue<number>(typeof gap === "string" ? gap : undefined, parseNumeric(gap)) ?? 0

  const templateColumns = useMemo(() => `repeat(${columns}, minmax(0, 1fr))`, [columns])
  const templateRows = useMemo(() => `repeat(${rows}, minmax(0, 1fr))`, [rows])

  return (
    <div
      ref={ref}
      className="border border-dashed border-slate-200"
      data-pagination-block
      data-pagination-root="true"
      style={{
        display: "grid",
        gridTemplateColumns: templateColumns,
        gridTemplateRows: templateRows,
        gap: gapValue,
        alignItems: alignItemsMap[align],
        gridAutoFlow: autoFlow,
        minHeight: 80,
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {children}
    </div>
  )
}

GridNode.craft = {
  displayName: "Grid",
  props: {
    columns: 2,
    rows: 1,
    gap: "spacing.md",
    align: "stretch",
    autoFlow: "row",
  },
  rules: {
    canDrop: () => true,
  },
}

"use client"

import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface StackNodeProps {
  direction?: "vertical" | "horizontal"
  gap?: number | string
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between"
}

const justifyMap: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
}

const alignMap: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
}

export function StackNode({
  direction = "vertical",
  gap = "spacing.md",
  align = "stretch",
  justify = "start",
  children,
}: React.PropsWithChildren<StackNodeProps>) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const gapValue = useTokenValue<number>(typeof gap === "string" ? gap : undefined, parseNumeric(gap)) ?? 0

  return (
    <div
      ref={ref}
      className="min-h-[40px] border border-dashed border-transparent"
      data-pagination-block
      data-pagination-root="true"
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap: gapValue,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {children}
    </div>
  )
}

StackNode.craft = {
  displayName: "Stack",
  props: {
    direction: "vertical",
    gap: "spacing.md",
    align: "stretch",
    justify: "start",
  },
  rules: {
    canDrop: () => true,
  },
}

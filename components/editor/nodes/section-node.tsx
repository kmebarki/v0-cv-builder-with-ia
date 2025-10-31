"use client"

import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface SectionNodeProps {
  title?: string
  showDivider?: boolean
  dividerColor?: string
  padding?: number | string
  background?: string
  gap?: number | string
  keepWithNext?: boolean
  breakBefore?: "auto" | "before" | "avoid"
  breakAfter?: "auto" | "after" | "avoid"
}

export function SectionNode({
  title = "Section",
  showDivider = true,
  dividerColor = "theme.divider",
  padding = "spacing.lg",
  background = "theme.surface",
  gap = "spacing.md",
  keepWithNext = false,
  breakBefore = "auto",
  breakAfter = "auto",
  children,
}: React.PropsWithChildren<SectionNodeProps>) {
  const { ref, translateX, translateY } = useRegisteredNode()

  const paddingValue = useTokenValue<number>(typeof padding === "string" ? padding : undefined, parseNumeric(padding)) ?? 0
  const backgroundValue = useTokenValue<string>(background, background)
  const gapValue = useTokenValue<number>(typeof gap === "string" ? gap : undefined, parseNumeric(gap)) ?? 0
  const dividerColorValue = useTokenValue<string>(dividerColor, dividerColor)

  return (
    <section
      ref={ref}
      className="rounded border border-dashed border-slate-200"
      data-pagination-block
      data-pagination-root="true"
      data-pagination-keep-with-next={keepWithNext ? "true" : "false"}
      data-pagination-break-before={breakBefore}
      data-pagination-break-after={breakAfter}
      style={{
        background: backgroundValue,
        padding: paddingValue,
        display: "flex",
        flexDirection: "column",
        gap: gapValue,
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {showDivider && <hr className="border-0" style={{ height: 1, backgroundColor: dividerColorValue }} />}
      </header>
      <div>{children}</div>
    </section>
  )
}

SectionNode.craft = {
  displayName: "Section",
  props: {
    title: "Section",
    showDivider: true,
    dividerColor: "theme.divider",
    padding: "spacing.lg",
    background: "theme.surface",
    gap: "spacing.md",
    keepWithNext: false,
    breakBefore: "auto" as const,
    breakAfter: "auto" as const,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
  },
}

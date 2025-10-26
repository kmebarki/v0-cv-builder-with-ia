"use client"

import { useMemo } from "react"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

const PAGE_SIZES = {
  a4: { width: 794, height: 1123 },
  mobile: { width: 360, height: 640 },
  web: { width: 1024, height: 1444 },
}

export interface PageNodeProps {
  orientation?: "portrait" | "landscape"
  background?: string
  padding?: number | string
  showBleed?: boolean
  bleed?: number | string
  pageBreak?: "auto" | "before" | "after" | "avoid"
}

export function PageNode({
  orientation = "portrait",
  background = "theme.surface",
  padding = "spacing.2xl",
  showBleed = false,
  bleed = "spacing.md",
  pageBreak = "auto",
  children,
}: React.PropsWithChildren<PageNodeProps>) {
  const { ref, translateX, translateY, nodeId } = useRegisteredNode()

  const { previewMode, theme, tokens } = useTemplateEditor()
  const themeDefinition = tokens.themes[theme] ?? tokens.themes.light
  const backgroundValue = useTokenValue<string>(background, background)
  const paddingValue = useTokenValue<number>(typeof padding === "string" ? padding : undefined, parseNumeric(padding)) ??
    (typeof padding === "number" ? padding : 0)
  const bleedValue = useTokenValue<number>(typeof bleed === "string" ? bleed : undefined, parseNumeric(bleed)) ??
    (typeof bleed === "number" ? bleed : 0)
  const surfaceColor = backgroundValue ?? themeDefinition.surface

  const { width, height } = useMemo(() => {
    const size = PAGE_SIZES[previewMode]
    if (!size) return PAGE_SIZES.a4
    if (orientation === "landscape") {
      return { width: size.height, height: size.width }
    }
    return size
  }, [orientation, previewMode])

  return (
    <div
      ref={ref}
      data-template-page
      data-template-theme={theme}
      data-pagination-page
      data-pagination-template-id={nodeId}
      data-pagination-break-before={pageBreak === "before" ? "before" : "auto"}
      data-pagination-break-after={pageBreak === "after" || pageBreak === "avoid" ? pageBreak : "auto"}
      className="relative mx-auto mb-12 box-border rounded-sm border shadow-sm"
      style={{
        width,
        minHeight: height,
        background: surfaceColor,
        padding: paddingValue,
        color: themeDefinition.text,
        borderColor: themeDefinition.divider,
        transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
        boxShadow:
          theme === "dark" ? "0 20px 45px rgba(15, 23, 42, 0.45)" : "0 15px 35px rgba(15, 23, 42, 0.15)",
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {showBleed && (
        <div
          className="pointer-events-none absolute inset-0 border border-dashed border-rose-300"
          style={{
            top: -bleedValue,
            bottom: -bleedValue,
            left: -bleedValue,
            right: -bleedValue,
          }}
        />
      )}
      {children}
    </div>
  )
}

PageNode.craft = {
  displayName: "Page",
  props: {
    orientation: "portrait",
    background: "theme.surface",
    padding: "spacing.2xl",
    showBleed: false,
    bleed: "spacing.md",
    pageBreak: "auto",
  },
  rules: {
    canDrag: () => true,
  },
}

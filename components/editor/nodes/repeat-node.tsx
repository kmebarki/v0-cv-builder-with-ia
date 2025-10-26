"use client"

import { Element } from "@craftjs/core"
import { useMemo, type ReactNode } from "react"
import { NestedBindingProvider, useBindingData } from "@/components/editor/binding-context"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { resolveCollection } from "@/lib/editor/repeat"
import { cn } from "@/lib/utils"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface RepeatNodeProps {
  collectionPath: string
  itemAlias?: string
  indexAlias?: string
  maxItems?: number
  emptyFallback?: string
  template?: ReactNode
  children?: ReactNode
  gap?: number | string
  layoutPreset?: "list" | "card" | "timeline"
  itemPadding?: number | string
  itemBackground?: string
  itemBorderColor?: string
  itemBorderWidth?: number | string
  alternateBackground?: boolean
  showDivider?: boolean
  dividerColor?: string
  allowItemSplit?: boolean
  orphans?: number
  widows?: number
  keepWithNext?: boolean
}

export function RepeatNode({
  collectionPath,
  itemAlias = "item",
  indexAlias = "index",
  maxItems,
  emptyFallback = "Aucun élément",
  gap = 16,
  layoutPreset = "list",
  itemPadding = 16,
  itemBackground,
  itemBorderColor,
  itemBorderWidth = 0,
  alternateBackground = false,
  showDivider = false,
  dividerColor,
  children,
  allowItemSplit = true,
  orphans = 1,
  widows = 1,
  keepWithNext = false,
}: RepeatNodeProps) {
  const { ref, translateX, translateY, nodeId } = useRegisteredNode()

  const { data } = useBindingData()
  const { theme, tokens } = useTemplateEditor()

  const gapValue = useTokenValue<number>(typeof gap === "string" ? gap : undefined, parseNumeric(gap)) ??
    (typeof gap === "number" ? gap : 0)
  const itemPaddingValue = useTokenValue<number>(
    typeof itemPadding === "string" ? itemPadding : undefined,
    parseNumeric(itemPadding),
  ) ?? (typeof itemPadding === "number" ? itemPadding : 0)
  const itemBackgroundValue = useTokenValue<string>(itemBackground, itemBackground)
  const itemBorderColorValue = useTokenValue<string>(itemBorderColor, itemBorderColor)
  const itemBorderWidthValue = useTokenValue<number>(
    typeof itemBorderWidth === "string" ? itemBorderWidth : undefined,
    parseNumeric(itemBorderWidth),
  ) ?? (typeof itemBorderWidth === "number" ? itemBorderWidth : 0)
  const dividerColorValue = useTokenValue<string>(dividerColor, dividerColor)

  const collection = useMemo(() => {
    return resolveCollection(data, collectionPath, { maxItems })
  }, [collectionPath, data, maxItems])

  const dividerStyle = useMemo(() => {
    if (!showDivider) return undefined
    const palette = tokens.themes[theme] ?? tokens.themes.light
    return {
      backgroundColor: dividerColorValue || palette.divider,
      opacity: 0.6,
      height: 1,
      width: "100%",
    }
  }, [dividerColorValue, showDivider, theme, tokens.themes])

  if (collection.length === 0) {
    return (
      <div
        ref={ref}
        className="rounded border border-dashed border-slate-300 p-4 text-center text-sm text-muted-foreground"
        data-pagination-block
        data-pagination-root="true"
        style={{ position: "relative", translate: `${translateX}px ${translateY}px` }}
      >
        {emptyFallback}
      </div>
    )
  }

  const groupId = useMemo(() => `repeat-${nodeId}`, [nodeId])

  return (
    <div
      ref={ref}
      className="flex flex-col"
      data-pagination-block
      data-pagination-root="true"
      data-pagination-collection="true"
      data-pagination-group-id={groupId}
      data-pagination-allow-split={allowItemSplit ? "true" : "false"}
      data-pagination-orphans={String(Math.max(0, orphans))}
      data-pagination-widows={String(Math.max(0, widows))}
      data-pagination-keep-with-next={keepWithNext ? "true" : "false"}
      style={{ gap: gapValue, position: "relative", translate: `${translateX}px ${translateY}px` }}
    >
      {collection.map((item, index) => {
        const palette = tokens.themes[theme] ?? tokens.themes.light
        const baseBackground = itemBackgroundValue ?? (layoutPreset === "card" ? palette.surface : undefined)
        const backgroundColor = alternateBackground && index % 2 === 1 ? palette.background : baseBackground
        const borderColor =
          itemBorderColorValue ||
          (layoutPreset === "card"
            ? palette.divider
            : layoutPreset === "timeline"
              ? palette.divider
              : undefined)
        const borderWidth =
          layoutPreset === "card" || layoutPreset === "timeline"
            ? itemBorderWidthValue || 1
            : itemBorderWidthValue

        return (
          <NestedBindingProvider
            // eslint-disable-next-line react/no-array-index-key
            key={index}
          alias={itemAlias}
          data={item}
          indexAlias={indexAlias}
          index={index}
          lengthAlias={`${indexAlias}Count`}
          length={collection.length}
        >
          <div
            className={cn(
              "relative flex flex-col gap-2",
              layoutPreset === "card" && "rounded-lg border shadow-sm",
              layoutPreset === "timeline" && "relative border-l-2 pl-8",
            )}
            data-pagination-block
            data-pagination-item="true"
            data-pagination-group={groupId}
            style={{
              padding: itemPaddingValue,
              backgroundColor,
              borderColor,
              borderWidth,
              borderStyle: borderWidth && borderWidth > 0 ? "solid" : undefined,
            }}
          >
            {layoutPreset === "timeline" && (
              <span
                className="absolute -left-[11px] top-4 block h-2.5 w-2.5 rounded-full border"
                style={{
                  backgroundColor: backgroundColor || palette.surface,
                  borderColor: borderColor || palette.text,
                  boxShadow: `0 0 0 4px ${backgroundColor || palette.background}`,
                }}
              />
            )}
            {children ? (
              children
            ) : (
              <Element is="div" canvas className="flex flex-col gap-2" />
            )}
          </div>
          {showDivider && index < collection.length - 1 && <div style={dividerStyle} />}
        </NestedBindingProvider>
      )})}
    </div>
  )
}

RepeatNode.craft = {
  displayName: "Repeat",
  props: {
    collectionPath: "experiences",
    itemAlias: "experience",
    indexAlias: "experienceIndex",
    emptyFallback: "Aucune donnée disponible",
    gap: "spacing.md",
    layoutPreset: "list",
    itemPadding: "spacing.md",
    itemBorderWidth: 1,
    alternateBackground: false,
    showDivider: false,
    allowItemSplit: true,
    orphans: 1,
    widows: 1,
    keepWithNext: false,
  },
  rules: {
    canDrop: () => true,
  },
}

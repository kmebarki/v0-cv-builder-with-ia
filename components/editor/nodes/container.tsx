"use client"

import type { ReactNode } from "react"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

interface ContainerProps {
  children?: ReactNode
  className?: string
  padding?: number | string
  margin?: number | string
  background?: string
  borderColor?: string
  borderWidth?: number | string
  borderStyle?: "solid" | "dashed" | "dotted" | "none"
  borderRadius?: number | string
  boxShadow?: string
  gap?: number | string
  direction?: "row" | "column"
  align?: "flex-start" | "center" | "flex-end" | "stretch"
  justify?: "flex-start" | "center" | "flex-end" | "space-between"
  width?: number | string
  height?: number | string
}

export function Container({
  children,
  className = "",
  padding = 0,
  margin = 0,
  background = "transparent",
  borderColor = "transparent",
  borderWidth = 0,
  borderStyle = "solid",
  borderRadius = 0,
  boxShadow = "none",
  gap = 0,
  direction = "column",
  align = "stretch",
  justify = "flex-start",
  width,
  height,
}: ContainerProps) {
  const { ref, translateX, translateY } = useRegisteredNode()

  const paddingValue = useTokenValue<number>(
    typeof padding === "string" ? padding : undefined,
    parseNumeric(padding),
  ) ?? 0
  const marginValue = useTokenValue<number>(typeof margin === "string" ? margin : undefined, parseNumeric(margin)) ?? 0
  const backgroundValue = useTokenValue<string>(background, background)
  const borderColorValue = useTokenValue<string>(borderColor, borderColor)
  const borderWidthValue = useTokenValue<number>(
    typeof borderWidth === "string" ? borderWidth : undefined,
    parseNumeric(borderWidth),
  ) ?? 0
  const borderRadiusValue = useTokenValue<number>(
    typeof borderRadius === "string" ? borderRadius : undefined,
    parseNumeric(borderRadius),
  ) ?? 0
  const boxShadowValue = useTokenValue<string>(boxShadow, boxShadow)
  const gapValue = useTokenValue<number>(typeof gap === "string" ? gap : undefined, parseNumeric(gap)) ?? 0

  return (
    <div
      ref={ref}
      className={className}
      data-pagination-block
      data-pagination-root="true"
      style={{
        padding: paddingValue,
        margin: marginValue,
        background: backgroundValue,
        borderColor: borderColorValue,
        borderWidth: borderWidthValue,
        borderStyle,
        borderRadius: borderRadiusValue,
        boxShadow: boxShadowValue,
        display: "flex",
        flexDirection: direction,
        gap: gapValue,
        alignItems: align,
        justifyContent: justify,
        width,
        height,
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {children}
    </div>
  )
}

Container.craft = {
  displayName: "Container",
  props: {
    padding: "spacing.none",
    margin: "spacing.none",
    background: "theme.surface",
    borderColor: "theme.divider",
    borderWidth: 0,
    borderStyle: "solid",
    borderRadius: "radii.none",
    boxShadow: "shadows.none",
    gap: "spacing.none",
    direction: "column",
    align: "stretch",
    justify: "flex-start",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
  },
}

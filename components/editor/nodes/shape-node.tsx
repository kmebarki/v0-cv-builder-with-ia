"use client"

import { useMemo } from "react"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface ShapeNodeProps {
  type?: "rectangle" | "circle" | "line"
  width?: number
  height?: number
  color?: string
  borderRadius?: number | string
  borderWidth?: number | string
  borderColor?: string
  rotate?: number
  shadow?: string
}

export function ShapeNode({
  type = "rectangle",
  width = 120,
  height = 8,
  color = "colors.muted",
  borderRadius = "radii.sm",
  borderWidth = 0,
  borderColor = "theme.divider",
  rotate = 0,
  shadow = "shadows.none",
}: ShapeNodeProps) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const colorValue = useTokenValue<string>(color, color)
  const borderRadiusValue = useTokenValue<number>(
    typeof borderRadius === "string" ? borderRadius : undefined,
    parseNumeric(borderRadius),
  ) ?? 0
  const borderWidthValue = useTokenValue<number>(
    typeof borderWidth === "string" ? borderWidth : undefined,
    parseNumeric(borderWidth),
  ) ?? 0
  const borderColorValue = useTokenValue<string>(borderColor, borderColor)
  const shadowValue = useTokenValue<string>(shadow, shadow)

  const style = useMemo(() => {
    const translation = `translate(${translateX}px, ${translateY}px)`
    const rotation = `rotate(${rotate}deg)`

    if (type === "line") {
      return {
        width,
        height: borderWidthValue || 2,
        backgroundColor: colorValue,
        transform: `${translation} ${rotation}`.trim(),
        boxShadow: shadowValue,
      }
    }

    return {
      width,
      height,
      backgroundColor: colorValue,
      borderRadius: type === "circle" ? Math.max(width, height) : borderRadiusValue,
      border: `${borderWidthValue}px solid ${borderColorValue}`,
      transform: `${translation} ${rotation}`.trim(),
      boxShadow: shadowValue,
    }
  }, [
    type,
    width,
    height,
    colorValue,
    borderRadiusValue,
    borderWidthValue,
    borderColorValue,
    rotate,
    shadowValue,
    translateX,
    translateY,
  ])

  return <div ref={ref} data-pagination-block data-pagination-root="true" style={style} />
}

ShapeNode.craft = {
  displayName: "Shape",
  props: {
    type: "rectangle",
    width: 120,
    height: 8,
    color: "colors.muted",
    borderRadius: "radii.sm",
    borderWidth: 0,
    borderColor: "theme.divider",
    rotate: 0,
    shadow: "shadows.none",
  },
}

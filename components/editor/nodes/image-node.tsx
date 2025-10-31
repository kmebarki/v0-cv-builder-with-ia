"use client"

import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

interface ImageNodeProps {
  src?: string
  alt?: string
  width?: number
  height?: number
  borderRadius?: number | string
  objectFit?: "cover" | "contain" | "fill" | "scale-down"
  borderColor?: string
  borderWidth?: number | string
  boxShadow?: string
  opacity?: number
}

export function ImageNode({
  src = "/placeholder.svg",
  alt = "Image",
  width = 200,
  height = 200,
  borderRadius = "radii.none",
  objectFit = "cover",
  borderColor = "theme.divider",
  borderWidth = 0,
  boxShadow = "shadows.none",
  opacity = 1,
}: ImageNodeProps) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const radiusValue = useTokenValue<number>(
    typeof borderRadius === "string" ? borderRadius : undefined,
    parseNumeric(borderRadius),
  ) ?? 0
  const borderColorValue = useTokenValue<string>(borderColor, borderColor)
  const borderWidthValue = useTokenValue<number>(
    typeof borderWidth === "string" ? borderWidth : undefined,
    parseNumeric(borderWidth),
  ) ?? 0
  const shadowValue = useTokenValue<string>(boxShadow, boxShadow)

  return (
    <img
      ref={ref}
      src={src || "/placeholder.svg"}
      alt={alt}
      data-pagination-block
      data-pagination-root="true"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        objectFit,
        borderRadius: radiusValue,
        borderColor: borderColorValue,
        borderWidth: borderWidthValue,
        borderStyle: "solid",
        boxShadow: shadowValue,
        opacity,
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    />
  )
}

ImageNode.craft = {
  displayName: "Image",
  props: {
    src: "/placeholder.svg",
    alt: "Image",
    width: 200,
    height: 200,
    borderRadius: "radii.none",
    objectFit: "cover",
    borderColor: "theme.divider",
    borderWidth: 0,
    boxShadow: "shadows.none",
    opacity: 1,
  },
}

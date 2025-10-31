"use client"

import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

export interface BadgeNodeProps {
  label?: string
  color?: string
  background?: string
  borderRadius?: number | string
  uppercase?: boolean
  paddingX?: number | string
  paddingY?: number | string
}

export function BadgeNode({
  label = "Badge",
  color = "colors.primary",
  background = "colors.accent",
  borderRadius = "radii.pill",
  uppercase = true,
  paddingX = "spacing.sm",
  paddingY = "spacing.xs",
}: BadgeNodeProps) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const colorValue = useTokenValue<string>(color, color)
  const backgroundValue = useTokenValue<string>(background, background)
  const radiusValue =
    useTokenValue<number>(typeof borderRadius === "string" ? borderRadius : undefined, parseNumeric(borderRadius)) ??
    (typeof borderRadius === "number" ? borderRadius : 0)
  const paddingXValue = useTokenValue<number>(typeof paddingX === "string" ? paddingX : undefined, parseNumeric(paddingX)) ?? 0
  const paddingYValue = useTokenValue<number>(typeof paddingY === "string" ? paddingY : undefined, parseNumeric(paddingY)) ?? 0

  return (
    <span
      ref={ref}
      data-pagination-block
      data-pagination-root="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: colorValue,
        backgroundColor: backgroundValue,
        borderRadius: radiusValue,
        padding: `${paddingYValue}px ${paddingXValue}px`,
        fontSize: 12,
        fontWeight: 600,
        textTransform: uppercase ? "uppercase" : "none",
        letterSpacing: uppercase ? 1 : 0,
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {label}
    </span>
  )
}

BadgeNode.craft = {
  displayName: "Badge",
  props: {
    label: "Badge",
    color: "colors.primary",
    background: "colors.accent",
    borderRadius: "radii.pill",
    uppercase: true,
    paddingX: "spacing.sm",
    paddingY: "spacing.xs",
  },
}

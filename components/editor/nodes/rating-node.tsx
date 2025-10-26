"use client"

import { useEffect, useMemo, useState } from "react"
import { Star, Circle, Square } from "lucide-react"
import { renderTemplateExpression, resolveVariable } from "@/lib/editor/variables"
import { useBindingData } from "@/components/editor/binding-context"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

const ICONS = {
  star: Star,
  circle: Circle,
  square: Square,
}

export interface RatingNodeProps {
  value?: number
  max?: number
  icon?: keyof typeof ICONS
  size?: number | string
  spacing?: number | string
  activeColor?: string
  inactiveColor?: string
  inactiveOpacity?: number
  showLabel?: boolean
  valueVariablePath?: string
  valueTemplate?: string
  maxVariablePath?: string
  maxTemplate?: string
  labelFormat?: "fraction" | "percentage"
  valueSource?: "static" | "variable" | "template"
  maxSource?: "static" | "variable" | "template"
}

export function RatingNode({
  value = 3,
  max = 5,
  icon = "star",
  size = 18,
  spacing = "spacing.xs",
  activeColor = "colors.accent",
  inactiveColor = "theme.divider",
  inactiveOpacity = 0.35,
  showLabel = false,
  valueVariablePath,
  valueTemplate,
  maxVariablePath,
  maxTemplate,
  labelFormat = "fraction",
  valueSource = "static",
  maxSource = "static",
}: RatingNodeProps) {
  const { ref, translateX, translateY } = useRegisteredNode()
  const { data: bindingData } = useBindingData()

  const Icon = useMemo(() => ICONS[icon] ?? Star, [icon])
  const [resolvedValue, setResolvedValue] = useState(value)
  const [resolvedMax, setResolvedMax] = useState(max)
  const spacingValue = useTokenValue<number>(typeof spacing === "string" ? spacing : undefined, parseNumeric(spacing)) ??
    (typeof spacing === "number" ? spacing : 0)
  const activeColorValue = useTokenValue<string>(activeColor, activeColor)
  const inactiveColorValue = useTokenValue<string>(inactiveColor, inactiveColor)

  useEffect(() => {
    let nextValue = value
    if (valueSource === "template" && valueTemplate && valueTemplate.trim().length > 0) {
      const rendered = renderTemplateExpression(valueTemplate, bindingData)
      const numeric = Number(rendered)
      if (!Number.isNaN(numeric)) {
        nextValue = numeric
      }
    }
    if (valueSource === "variable" && valueVariablePath) {
      const raw = resolveVariable(bindingData, valueVariablePath)
      const numeric = Number(raw)
      if (!Number.isNaN(numeric)) {
        nextValue = numeric
      }
    }

    let nextMax = max
    if (maxSource === "template" && maxTemplate && maxTemplate.trim().length > 0) {
      const renderedMax = renderTemplateExpression(maxTemplate, bindingData)
      const numericMax = Number(renderedMax)
      if (!Number.isNaN(numericMax) && numericMax > 0) {
        nextMax = numericMax
      }
    }
    if (maxSource === "variable" && maxVariablePath) {
      const rawMax = resolveVariable(bindingData, maxVariablePath)
      const numericMax = Number(rawMax)
      if (!Number.isNaN(numericMax) && numericMax > 0) {
        nextMax = numericMax
      }
    }

    setResolvedValue(nextValue)
    setResolvedMax(Math.max(1, nextMax))
  }, [
    bindingData,
    max,
    maxTemplate,
    maxVariablePath,
    maxSource,
    value,
    valueTemplate,
    valueVariablePath,
    valueSource,
  ])

  const label = useMemo(() => {
    if (!showLabel) return null
    if (labelFormat === "percentage") {
      if (resolvedMax <= 0) return "0 %"
      const percentage = Math.round((resolvedValue / resolvedMax) * 100)
      return `${percentage} %`
    }
    return `${Math.round(resolvedValue * 100) / 100}/${resolvedMax}`
  }, [labelFormat, resolvedMax, resolvedValue, showLabel])

  return (
    <div
      ref={ref}
      className="inline-flex items-center gap-2"
      data-pagination-block
      data-pagination-root="true"
      style={{ position: "relative", translate: `${translateX}px ${translateY}px` }}
    >
      <div className="flex" style={{ gap: spacingValue }}>
        {Array.from({ length: resolvedMax }, (_, index) => {
          const isActive = index < resolvedValue
          return (
            <Icon
              key={index}
              style={{
                width: size,
                height: size,
                color: isActive ? activeColorValue : inactiveColorValue,
                opacity: isActive ? 1 : inactiveOpacity,
              }}
            />
          )
        })}
      </div>
      {showLabel && label && <span className="text-sm text-slate-600">{label}</span>}
    </div>
  )
}

RatingNode.craft = {
  displayName: "Rating",
  props: {
    value: 3,
    max: 5,
    icon: "star",
    size: 18,
    spacing: "spacing.xs",
    activeColor: "colors.accent",
    inactiveColor: "theme.divider",
    inactiveOpacity: 0.35,
    showLabel: false,
    valueVariablePath: "",
    valueTemplate: "",
    maxVariablePath: "",
    maxTemplate: "",
    labelFormat: "fraction" as const,
    valueSource: "static" as const,
    maxSource: "static" as const,
  },
}

"use client"

import { useEffect, useState } from "react"
import { useNode } from "@craftjs/core"
import {
  resolveVariable,
  applyFunction,
  evaluateCondition,
  VARIABLE_FUNCTIONS,
  renderTemplateExpression,
  type CONDITIONAL_OPERATORS,
} from "@/lib/editor/variables"
import { useBindingData } from "@/components/editor/binding-context"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

interface VariableTextNodeProps {
  variablePath?: string
  functions?: (keyof typeof VARIABLE_FUNCTIONS)[]
  fallbackText?: string
  mode?: "single" | "template"
  template?: string
  fontSize?: number | string
  fontWeight?: string
  color?: string
  textAlign?: string
  fontFamily?: string
  lineHeight?: number
  letterSpacing?: number
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize"
  background?: string
  padding?: number | string
  borderRadius?: number | string
  showOutline?: boolean
  conditionalDisplay?: {
    enabled: boolean
    variablePath: string
    operator: keyof typeof CONDITIONAL_OPERATORS
    compareValue?: string
  }
}

export function VariableTextNode({
  variablePath = "",
  functions = [],
  fallbackText = "Variable",
  mode = "single",
  template = "",
  fontSize = "fontSizes.md",
  fontWeight = "normal",
  color = "theme.text",
  textAlign = "left",
  fontFamily = "fonts.body",
  lineHeight = 1.4,
  letterSpacing = 0,
  textTransform = "none",
  background = "theme.surface",
  padding = "spacing.xs",
  borderRadius = "radii.sm",
  showOutline = false,
  conditionalDisplay,
}: VariableTextNodeProps) {
  const { ref, translateX, translateY } = useRegisteredNode()

  const { data: bindingData } = useBindingData()
  const [displayValue, setDisplayValue] = useState(fallbackText)
  const [shouldDisplay, setShouldDisplay] = useState(true)

  const colorValue = useTokenValue<string>(color, color)
  const backgroundValue = useTokenValue<string>(background, background)
  const paddingValue = useTokenValue<number>(typeof padding === "string" ? padding : undefined, parseNumeric(padding)) ??
    (typeof padding === "number" ? padding : 0)
  const borderRadiusValue = useTokenValue<number>(
    typeof borderRadius === "string" ? borderRadius : undefined,
    parseNumeric(borderRadius),
  ) ?? (typeof borderRadius === "number" ? borderRadius : 0)
  const fontSizeToken = typeof fontSize === "string" ? fontSize : undefined
  const fontSizeDefinition = useTokenValue<{ size: number; lineHeight: number }>(fontSizeToken, undefined)
  const fontFamilyToken = typeof fontFamily === "string" && fontFamily.includes(".") ? fontFamily : undefined
  const fontFamilyDefinition = useTokenValue<{ family: string; weight: number; lineHeight: number }>(
    fontFamilyToken,
    undefined,
  )
  const resolvedFontSize = fontSizeDefinition?.size ?? (typeof fontSize === "number" ? fontSize : 16)
  const resolvedLineHeight = fontSizeDefinition?.lineHeight ?? fontFamilyDefinition?.lineHeight ?? lineHeight ?? 1.4
  const resolvedFontFamily = fontFamilyDefinition?.family
    ? `${fontFamilyDefinition.family}, sans-serif`
    : fontFamily || "Inter, sans-serif"
  const resolvedFontWeight = fontFamilyDefinition?.weight?.toString() ?? fontWeight ?? "normal"

  useEffect(() => {
    // Check conditional display
    if (conditionalDisplay?.enabled) {
      const shouldShow = evaluateCondition(
        bindingData,
        conditionalDisplay.variablePath,
        conditionalDisplay.operator,
        conditionalDisplay.compareValue,
      )
      setShouldDisplay(shouldShow)
      if (!shouldShow) return
    }

    if (mode === "template" && template.trim().length > 0) {
      const value = renderTemplateExpression(template, bindingData)
      setDisplayValue(value || fallbackText)
      return
    }

    if (variablePath) {
      let value = resolveVariable(bindingData, variablePath)

      if (value && functions.length > 0) {
        for (const func of functions) {
          value = applyFunction(String(value), func)
        }
      }

      setDisplayValue(value || fallbackText)
      return
    }

    setDisplayValue(fallbackText)
  }, [
    conditionalDisplay,
    bindingData,
    fallbackText,
    functions,
    mode,
    template,
    variablePath,
  ])

  if (!shouldDisplay) {
    return null
  }

  return (
    <div
      ref={ref}
      data-pagination-block
      data-pagination-root="true"
      style={{
        fontSize: `${resolvedFontSize}px`,
        fontWeight: resolvedFontWeight,
        color: colorValue,
        textAlign: textAlign as any,
        fontFamily: resolvedFontFamily,
        lineHeight: resolvedLineHeight,
        letterSpacing,
        textTransform,
        cursor: "move",
        padding: paddingValue,
        borderRadius: borderRadiusValue,
        backgroundColor: backgroundValue,
        border: showOutline ? "1px dashed #cbd5f5" : "none",
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      {displayValue}
    </div>
  )
}

VariableTextNode.craft = {
  displayName: "Variable Text",
  props: {
    variablePath: "",
    functions: [],
    fallbackText: "Variable",
    mode: "single" as const,
    template: "",
    fontSize: "fontSizes.md",
    fontWeight: "normal",
    color: "theme.text",
    textAlign: "left",
    fontFamily: "fonts.body",
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: "none",
    background: "theme.surface",
    padding: "spacing.xs",
    borderRadius: "radii.sm",
    showOutline: false,
    conditionalDisplay: {
      enabled: false,
      variablePath: "",
      operator: "exists" as const,
      compareValue: "",
    },
  },
  related: {
    toolbar: () => <div>Variable Text Settings</div>,
  },
}

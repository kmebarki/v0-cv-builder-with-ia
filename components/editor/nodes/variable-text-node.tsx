"use client"

import { useNode } from "@craftjs/core"
import { useEffect, useState } from "react"
import {
  resolveVariable,
  applyFunction,
  evaluateCondition,
  type VARIABLE_FUNCTIONS,
  type CONDITIONAL_OPERATORS,
} from "@/lib/editor/variables"

interface VariableTextNodeProps {
  variablePath?: string
  functions?: (keyof typeof VARIABLE_FUNCTIONS)[]
  fallbackText?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  textAlign?: string
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
  fontSize = 16,
  fontWeight = "normal",
  color = "#000000",
  textAlign = "left",
  conditionalDisplay,
}: VariableTextNodeProps) {
  const {
    connectors: { connect, drag },
  } = useNode()

  const [displayValue, setDisplayValue] = useState(fallbackText)
  const [shouldDisplay, setShouldDisplay] = useState(true)

  // In a real app, this would come from a context or prop
  // For now, we'll use mock data
  const cvData = {
    users: {
      first_name: "Jean",
      last_name: "Dupont",
      email: "jean.dupont@example.com",
      professional_title: "Développeur Full Stack",
    },
  }

  useEffect(() => {
    // Check conditional display
    if (conditionalDisplay?.enabled) {
      const shouldShow = evaluateCondition(
        cvData,
        conditionalDisplay.variablePath,
        conditionalDisplay.operator,
        conditionalDisplay.compareValue,
      )
      setShouldDisplay(shouldShow)
      if (!shouldShow) return
    }

    // Resolve variable value
    if (variablePath) {
      let value = resolveVariable(cvData, variablePath)

      // Apply functions in order
      if (value && functions.length > 0) {
        for (const func of functions) {
          value = applyFunction(String(value), func)
        }
      }

      setDisplayValue(value || fallbackText)
    }
  }, [variablePath, functions, fallbackText, conditionalDisplay, cvData])

  if (!shouldDisplay) {
    return null
  }

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        textAlign: textAlign as any,
        cursor: "move",
        padding: "4px",
        border: "1px dashed #ccc",
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
    fontSize: 16,
    fontWeight: "normal",
    color: "#000000",
    textAlign: "left",
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

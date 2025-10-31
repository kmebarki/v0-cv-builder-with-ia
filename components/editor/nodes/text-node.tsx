"use client"

import ContentEditable from "react-contenteditable"
import { useEffect, useRef } from "react"
import { useNode } from "@craftjs/core"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

interface TextNodeProps {
  text?: string
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
}

export function TextNode({
  text = "Texte",
  fontSize = 16,
  fontWeight = "normal",
  color = "#000000",
  textAlign = "left",
  fontFamily = "Inter, sans-serif",
  lineHeight = 1.4,
  letterSpacing = 0,
  textTransform = "none",
  background = "transparent",
  padding = 0,
  borderRadius = 0,
}: TextNodeProps) {
  const {
    actions: { setProp },
  } = useNode()
  const { ref, translateX, translateY } = useRegisteredNode()

  const colorValue = useTokenValue<string>(color, color)
  const backgroundValue = useTokenValue<string>(background, background)

  const fontFamilyToken = typeof fontFamily === "string" && fontFamily.includes(".") ? fontFamily : undefined
  const fontFamilyDefinition = useTokenValue<{ family: string; weight: number; lineHeight: number }>(
    fontFamilyToken,
    undefined,
  )

  const fontSizeToken = typeof fontSize === "string" && fontSize.includes(".") ? fontSize : undefined
  const fontSizeDefinition = useTokenValue<{ size: number; lineHeight: number }>(fontSizeToken, undefined)

  const paddingToken = typeof padding === "string" && padding.includes(".") ? padding : undefined
  const paddingValue = useTokenValue<number>(paddingToken, parseNumeric(padding)) ?? 0

  const radiusToken = typeof borderRadius === "string" && borderRadius.includes(".") ? borderRadius : undefined
  const radiusValue = useTokenValue<number>(radiusToken, parseNumeric(borderRadius)) ?? 0

  const textRef = useRef(text)

  useEffect(() => {
    textRef.current = text
  }, [text])

  const effectiveFontSize = fontSizeDefinition?.size ?? (typeof fontSize === "number" ? fontSize : 16)
  const effectiveLineHeight =
    fontSizeDefinition?.lineHeight ?? fontFamilyDefinition?.lineHeight ?? lineHeight ?? 1.4
  const effectiveFontFamily = fontFamilyDefinition?.family
    ? `${fontFamilyDefinition.family}, sans-serif`
    : fontFamily || "Inter, sans-serif"
  const effectiveFontWeight = fontFamilyDefinition?.weight?.toString() ?? fontWeight ?? "normal"

  return (
    <ContentEditable
      innerRef={ref}
      html={textRef.current}
      onChange={(e) => {
        textRef.current = e.target.value
        setProp((props: TextNodeProps) => (props.text = e.target.value))
      }}
      tagName="div"
      data-pagination-block=""
      data-pagination-root="true"
      style={{
        fontSize: `${effectiveFontSize}px`,
        fontWeight: effectiveFontWeight,
        color: colorValue,
        textAlign: textAlign as any,
        fontFamily: effectiveFontFamily,
        lineHeight: effectiveLineHeight,
        letterSpacing,
        textTransform,
        backgroundColor: backgroundValue,
        padding: paddingValue,
        borderRadius: radiusValue,
        outline: "none",
        cursor: "text",
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    />
  )
}

TextNode.craft = {
  displayName: "Text",
  props: {
    text: "Texte",
    fontSize: "fontSizes.md",
    fontWeight: "normal",
    color: "theme.text",
    textAlign: "left",
    fontFamily: "fonts.body",
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: "none",
    background: "theme.surface",
    padding: "spacing.none",
    borderRadius: "radii.none",
  },
  related: {
    toolbar: () => <div>Text Settings</div>,
  },
}

"use client"

import { useNode } from "@craftjs/core"
import ContentEditable from "react-contenteditable"
import { useRef } from "react"

interface TextNodeProps {
  text?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  textAlign?: string
}

export function TextNode({
  text = "Texte",
  fontSize = 16,
  fontWeight = "normal",
  color = "#000000",
  textAlign = "left",
}: TextNodeProps) {
  const {
    connectors: { connect, drag },
    actions: { setProp },
  } = useNode()

  const textRef = useRef(text)

  return (
    <ContentEditable
      innerRef={(ref) => ref && connect(drag(ref))}
      html={textRef.current}
      onChange={(e) => {
        textRef.current = e.target.value
        setProp((props: TextNodeProps) => (props.text = e.target.value))
      }}
      tagName="div"
      style={{
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        textAlign: textAlign as any,
        outline: "none",
        cursor: "text",
      }}
    />
  )
}

TextNode.craft = {
  displayName: "Text",
  props: {
    text: "Texte",
    fontSize: 16,
    fontWeight: "normal",
    color: "#000000",
    textAlign: "left",
  },
  related: {
    toolbar: () => <div>Text Settings</div>,
  },
}

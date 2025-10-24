"use client"

import { useNode } from "@craftjs/core"
import { Plate, PlateContent, createPlateEditor } from "@udecode/plate-common"
import { createBoldPlugin } from "@udecode/plate-basic-marks/react"
import { createItalicPlugin } from "@udecode/plate-basic-marks/react"
import { createUnderlinePlugin } from "@udecode/plate-basic-marks/react"
import { createHeadingPlugin } from "@udecode/plate-heading/react"
import { createParagraphPlugin } from "@udecode/plate-paragraph/react"
import { createAlignPlugin } from "@udecode/plate-alignment/react"
import { createFontColorPlugin, createFontBackgroundColorPlugin } from "@udecode/plate-font/react"
import { useMemo } from "react"

interface RichTextNodeProps {
  content?: any[]
  minHeight?: number
}

export function RichTextNode({
  content = [{ type: "p", children: [{ text: "Texte enrichi..." }] }],
  minHeight = 100,
}: RichTextNodeProps) {
  const {
    connectors: { connect, drag },
    actions: { setProp },
  } = useNode()

  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [
          createParagraphPlugin(),
          createHeadingPlugin(),
          createBoldPlugin(),
          createItalicPlugin(),
          createUnderlinePlugin(),
          createAlignPlugin(),
          createFontColorPlugin(),
          createFontBackgroundColorPlugin(),
        ],
        value: content,
      }),
    [],
  )

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{ minHeight: `${minHeight}px` }}
      className="rounded border border-dashed border-gray-300 p-2"
    >
      <Plate
        editor={editor}
        onChange={(newValue) => {
          setProp((props: RichTextNodeProps) => (props.content = newValue))
        }}
      >
        <PlateContent className="prose max-w-none focus:outline-none" placeholder="Commencez à écrire..." />
      </Plate>
    </div>
  )
}

RichTextNode.craft = {
  displayName: "Rich Text",
  props: {
    content: [{ type: "p", children: [{ text: "Texte enrichi..." }] }],
    minHeight: 100,
  },
  related: {
    toolbar: () => <div>Rich Text Settings</div>,
  },
}

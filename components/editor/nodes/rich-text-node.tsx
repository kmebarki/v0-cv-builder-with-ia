"use client"

import React, { useMemo, useCallback } from "react"
import { useNode } from "@craftjs/core"
import { createEditor, Descendant, Transforms, Editor, Text } from "slate"
import { Slate, Editable, withReact, ReactEditor } from "slate-react"
import { useRegisteredNode } from "@/components/editor/use-registered-node"
import { useTokenValue } from "@/components/editor/use-token-value"
import { parseNumeric } from "@/lib/editor/token-utils"

type RichTextNodeProps = {
  content?: Descendant[]
  minHeight?: number
  background?: string
  padding?: number | string
  borderRadius?: number | string
  borderColor?: string
  borderWidth?: number | string
}

const DEFAULT_VALUE: Descendant[] = [
  { type: "paragraph", children: [{ text: "Texte enrichi..." }] },
]

// Rendu des éléments bloc (paragraphes, titres, etc.)
const Element = (props: any) => {
  const { attributes, children, element } = props
  switch (element.type) {
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>
    case "paragraph":
    default:
      return <p {...attributes}>{children}</p>
  }
}

// Rendu des feuilles (gras, italique, souligné…)
const Leaf = (props: any) => {
  const { attributes, children, leaf } = props
  let out = children
  if (leaf.bold) out = <strong>{out}</strong>
  if (leaf.italic) out = <em>{out}</em>
  if (leaf.underline) out = <u>{out}</u>
  if (leaf.color) out = <span style={{ color: leaf.color }}>{out}</span>
  if (leaf.bg) out = <span style={{ backgroundColor: leaf.bg }}>{out}</span>
  return <span {...attributes}>{out}</span>
}

// Utilitaires marks
const isMarkActive = (editor: Editor, mark: string) => {
  const marks = Editor.marks(editor) as any
  return marks ? marks[mark] === true : false
}
const toggleMark = (editor: Editor, mark: string) => {
  const isActive = isMarkActive(editor, mark)
  if (isActive) Editor.removeMark(editor, mark)
  else Editor.addMark(editor, mark, true)
}

export function RichTextNode({
  content = DEFAULT_VALUE,
  minHeight = 100,
  background = "theme.surface",
  padding = "spacing.md",
  borderRadius = "radii.md",
  borderColor = "theme.divider",
  borderWidth = 1,
}: RichTextNodeProps) {
  const {
    actions: { setProp },
  } = useNode()
  const { ref, translateX, translateY } = useRegisteredNode()

  const backgroundValue = useTokenValue<string>(background, background)
  const paddingValue = useTokenValue<number>(typeof padding === "string" ? padding : undefined, parseNumeric(padding)) ??
    (typeof padding === "number" ? padding : 0)
  const borderRadiusValue = useTokenValue<number>(
    typeof borderRadius === "string" ? borderRadius : undefined,
    parseNumeric(borderRadius),
  ) ?? (typeof borderRadius === "number" ? borderRadius : 0)
  const borderColorValue = useTokenValue<string>(borderColor, borderColor)
  const borderWidthValue = useTokenValue<number>(
    typeof borderWidth === "string" ? borderWidth : undefined,
    parseNumeric(borderWidth),
  ) ?? (typeof borderWidth === "number" ? borderWidth : 0)

  // Éditeur Slate
  const editor = useMemo(() => withReact(createEditor() as ReactEditor), [])

  // Gestion du changement → on pousse la valeur dans Craft
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setProp((props: RichTextNodeProps) => {
        props.content = newValue
      })
    },
    [setProp],
  )

  // Raccourcis clavier basiques (Cmd/Ctrl+B/I/U)
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
        const key = event.key.toLowerCase()
        if (key === "b" || key === "i" || key === "u") {
          event.preventDefault()
          const mark =
            key === "b" ? "bold" : key === "i" ? "italic" : "underline"
          toggleMark(editor, mark)
        }
      }
    },
    [editor],
  )

  // ToolBar minimaliste (optionnelle)
  const Toolbar = () => (
    <div className="mb-2 flex gap-2">
      <button
        type="button"
        className="rounded border px-2 py-1 text-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          toggleMark(editor, "bold")
        }}
      >
        Gras
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          toggleMark(editor, "italic")
        }}
      >
        Italique
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          toggleMark(editor, "underline")
        }}
      >
        Souligné
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          // Exemple d’alignement basique : on convertit le bloc courant en h2
          Transforms.setNodes(
            editor,
            { type: "heading-two" },
            { match: (n) => Editor.isBlock(editor, n) },
          )
        }}
      >
        H2
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-sm"
        onMouseDown={(e) => {
          e.preventDefault()
          Transforms.setNodes(
            editor,
            { type: "paragraph" },
            { match: (n) => Editor.isBlock(editor, n) },
          )
        }}
      >
        Paragraphe
      </button>
    </div>
  )

  return (
    <div
      ref={ref}
      data-pagination-block
      data-pagination-root="true"
      style={{
        minHeight,
        background: backgroundValue,
        padding: paddingValue,
        borderRadius: borderRadiusValue,
        borderWidth: borderWidthValue,
        borderColor: borderColorValue,
        borderStyle: "dashed",
        position: "relative",
        translate: `${translateX}px ${translateY}px`,
      }}
    >
      <Slate editor={editor} initialValue={content} onChange={handleChange}>
        <Toolbar />
        <Editable
          className="prose max-w-none focus:outline-none"
          placeholder="Commencez à écrire..."
          renderElement={(p) => <Element {...p} />}
          renderLeaf={(p) => <Leaf {...p} />}
          onKeyDown={onKeyDown}
          spellCheck
          autoFocus={false}
        />
      </Slate>
    </div>
  )
}

RichTextNode.craft = {
  displayName: "Rich Text",
  props: {
    content: DEFAULT_VALUE,
    minHeight: 100,
    background: "theme.surface",
    padding: "spacing.md",
    borderRadius: "radii.md",
    borderColor: "theme.divider",
    borderWidth: 1,
  },
  related: {
    toolbar: () => <div>Rich Text Settings</div>,
  },
}

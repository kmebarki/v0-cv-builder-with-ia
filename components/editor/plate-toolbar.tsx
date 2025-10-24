"use client"

import { useEditorRef, useEditorSelector } from "@udecode/plate-common/react"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Type,
} from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function PlateToolbar() {
  const editor = useEditorRef()
  const marks = useEditorSelector((editor) => editor.marks, [])

  if (!editor) return null

  return (
    <div className="flex items-center gap-1 border-b bg-background p-2">
      {/* Text formatting */}
      <ToggleGroup type="multiple" className="gap-1">
        <ToggleGroupItem
          value="bold"
          aria-label="Gras"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "bold" })}
        >
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="italic"
          aria-label="Italique"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "italic" })}
        >
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="underline"
          aria-label="Souligné"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "underline" })}
        >
          <Underline className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Headings */}
      <ToggleGroup type="single" className="gap-1">
        <ToggleGroupItem
          value="p"
          aria-label="Paragraphe"
          size="sm"
          onClick={() => editor.tf.toggle.block({ type: "p" })}
        >
          <Type className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="h1"
          aria-label="Titre 1"
          size="sm"
          onClick={() => editor.tf.toggle.block({ type: "h1" })}
        >
          <Heading1 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="h2"
          aria-label="Titre 2"
          size="sm"
          onClick={() => editor.tf.toggle.block({ type: "h2" })}
        >
          <Heading2 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="h3"
          aria-label="Titre 3"
          size="sm"
          onClick={() => editor.tf.toggle.block({ type: "h3" })}
        >
          <Heading3 className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Alignment */}
      <ToggleGroup type="single" className="gap-1">
        <ToggleGroupItem
          value="left"
          aria-label="Aligner à gauche"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "align", value: "left" })}
        >
          <AlignLeft className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="center"
          aria-label="Centrer"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "align", value: "center" })}
        >
          <AlignCenter className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="right"
          aria-label="Aligner à droite"
          size="sm"
          onClick={() => editor.tf.toggle.mark({ key: "align", value: "right" })}
        >
          <AlignRight className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Colors */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Couleur:</label>
        <input
          type="color"
          className="h-8 w-12 cursor-pointer rounded border"
          onChange={(e) => editor.tf.toggle.mark({ key: "color", value: e.target.value })}
        />
        <label className="text-xs text-muted-foreground">Fond:</label>
        <input
          type="color"
          className="h-8 w-12 cursor-pointer rounded border"
          onChange={(e) => editor.tf.toggle.mark({ key: "backgroundColor", value: e.target.value })}
        />
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { useEditor } from "@craftjs/core"
import { Save, Undo, Redo } from "lucide-react"

interface EditorHeaderProps {
  cvName: string
  onSave: (query: any) => Promise<void>
  isSaving: boolean
}

export function EditorHeader({ cvName, onSave, isSaving }: EditorHeaderProps) {
  const { query, actions, canUndo, canRedo } = useEditor((state, query) => ({
    canUndo: state.options.enabled && query.history.canUndo(),
    canRedo: state.options.enabled && query.history.canRedo(),
  }))

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-lg font-semibold">{cvName}</h1>
        <p className="text-xs text-muted-foreground">Éditeur de CV</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => actions.history.undo()} disabled={!canUndo}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => actions.history.redo()} disabled={!canRedo}>
          <Redo className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => onSave(query)} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </header>
  )
}

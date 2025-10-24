"use client"

import { Editor, Frame, Element } from "@craftjs/core"
import { Layers } from "@craftjs/layers"
import { Container } from "@/components/editor/nodes/container"
import { TextNode } from "@/components/editor/nodes/text-node"
import { ImageNode } from "@/components/editor/nodes/image-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { Toolbox } from "@/components/editor/toolbox"
import { SettingsPanel } from "@/components/editor/settings-panel"
import { EditorHeader } from "@/components/editor/editor-header"
import { useState } from "react"
import { toast } from "sonner"
import { RichTextNode } from "@/components/editor/nodes/rich-text-node"

interface CVEditorProps {
  cvId: string
  cvName: string
  initialStructure: any
  onSave: (structure: string) => Promise<void>
}

export function CVEditor({ cvId, cvName, initialStructure, onSave }: CVEditorProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (query: any) => {
    setIsSaving(true)
    try {
      const json = query.serialize()
      await onSave(json)
      toast.success("CV sauvegardé avec succès")
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Editor
      resolver={{
        Container,
        TextNode,
        ImageNode,
        VariableTextNode,
        RichTextNode,
      }}
    >
      <div className="flex h-screen flex-col">
        <EditorHeader cvName={cvName} onSave={handleSave} isSaving={isSaving} />

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbox - Left Sidebar */}
          <div className="w-64 border-r bg-background p-4">
            <Toolbox />
          </div>

          {/* Canvas - Center */}
          <div className="flex-1 overflow-auto bg-muted/30 p-8">
            <div className="mx-auto max-w-4xl">
              <Frame>
                <Element is={Container} canvas className="min-h-[1000px] bg-white p-8 shadow-lg">
                  <Element is={TextNode} text="Votre Nom" fontSize={32} fontWeight="bold" />
                  <Element is={TextNode} text="Titre du poste" fontSize={18} color="#666666" />
                  <Element is={Container} canvas className="mt-8">
                    <Element is={TextNode} text="À propos" fontSize={24} fontWeight="bold" />
                    <Element
                      is={TextNode}
                      text="Décrivez votre parcours professionnel et vos compétences..."
                      fontSize={14}
                    />
                  </Element>
                </Element>
              </Frame>
            </div>
          </div>

          {/* Settings Panel - Right Sidebar */}
          <div className="w-80 border-l bg-background">
            <div className="h-1/2 border-b p-4">
              <h3 className="mb-4 font-semibold">Paramètres</h3>
              <SettingsPanel />
            </div>
            <div className="h-1/2 overflow-auto p-4">
              <h3 className="mb-4 font-semibold">Calques</h3>
              <Layers />
            </div>
          </div>
        </div>
      </div>
    </Editor>
  )
}

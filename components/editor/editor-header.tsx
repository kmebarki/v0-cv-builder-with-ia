"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useEditor } from "@craftjs/core"
import {
  Save,
  Undo,
  Redo,
  Play,
  Download,
  History,
  Copy,
  MonitorSmartphone,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { nanoid } from "nanoid"
import type { PreviewMode } from "@/components/editor/editor-context"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { prepareCanvasForExport } from "@/components/editor/export-utils"

interface EditorHeaderProps {
  cvName: string
  onSave: (query: any) => Promise<void>
  isSaving: boolean
  previewMode: PreviewMode
  onPreviewModeChange: (mode: PreviewMode) => void
}

interface SavedVersion {
  id: string
  name: string
  createdAt: string
  data: string
}

export function EditorHeader({ cvName, onSave, isSaving, previewMode, onPreviewModeChange }: EditorHeaderProps) {
  const { query, actions, canUndo, canRedo } = useEditor((state, query) => ({
    canUndo: state.options.enabled && query.history.canUndo(),
    canRedo: state.options.enabled && query.history.canRedo(),
  }))

  const [versions, setVersions] = useState<SavedVersion[]>([])
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingDocx, setIsExportingDocx] = useState(false)
  const { cvData, canvasElement, theme, tokens, tokenSource, zoom } = useTemplateEditor()

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("cv-template-versions")
    if (stored) {
      try {
        setVersions(JSON.parse(stored))
      } catch (error) {
        console.error("Impossible de charger les versions locales", error)
      }
    }
  }, [])

  const persistVersions = (next: SavedVersion[]) => {
    setVersions(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cv-template-versions", JSON.stringify(next))
    }
  }

  const handleExportJSON = () => {
    const json = query.serialize()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `template-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Export JSON prêt")
  }

  const collectDocumentStyles = useMemo(() => {
    return () => {
      if (typeof window === "undefined") return ""
      const collected: string[] = []
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = sheet.cssRules
          if (!rules) continue
          for (const rule of Array.from(rules)) {
            collected.push(rule.cssText)
          }
        } catch (error) {
          console.warn("Impossible de lire une feuille de style", error)
        }
      }
      return collected.join("\n")
    }
  }, [])

  const handleExportPDF = async () => {
    if (!canvasElement) {
      toast.error("Canvas introuvable pour l'export PDF")
      return
    }

    setIsExportingPdf(true)
    try {
      const prepared = prepareCanvasForExport(canvasElement, { zoom })

      const response = await fetch("/api/editor/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: prepared.html,
          styles: collectDocumentStyles(),
          mode: previewMode,
          theme,
          tokens,
          tokenSource,
        }),
      })

      if (!response.ok) {
        throw new Error("PDF export failed")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${cvName || "template"}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("PDF généré avec succès")
    } catch (error) {
      console.error("PDF export error", error)
      toast.error("L'export PDF a échoué")
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportDocx = async () => {
    setIsExportingDocx(true)
    try {
      const prepared = canvasElement ? prepareCanvasForExport(canvasElement, { zoom }) : { html: "" }
      const serialized = query.serialize()
      const response = await fetch("/api/editor/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvName,
          cvData,
          structure: serialized,
          html: prepared.html,
          styles: collectDocumentStyles(),
          mode: previewMode,
          theme,
          tokens,
          tokenSource,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        if (payload?.details) {
          toast.error("Champs personnalisés invalides", {
            description: Array.isArray(payload.details) ? payload.details.join("\n") : String(payload.details),
          })
          return
        }
        throw new Error("DOCX export failed")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${cvName || "template"}.docx`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("DOCX généré avec succès")
    } catch (error) {
      console.error("Docx export error", error)
      toast.error("L'export DOCX a échoué")
    } finally {
      setIsExportingDocx(false)
    }
  }

  const handleDuplicate = () => {
    const json = query.serialize()
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cv-template-duplicate", json)
    }
    toast.success("Copie du template enregistrée localement")
  }

  const handleSaveVersion = () => {
    const json = query.serialize()
    const version: SavedVersion = {
      id: nanoid(),
      name: `Version ${versions.length + 1}`,
      createdAt: new Date().toISOString(),
      data: json,
    }
    persistVersions([version, ...versions])
    toast.success("Version sauvegardée")
  }

  const handleLoadVersion = (id: string) => {
    const target = versions.find((version) => version.id === id)
    if (!target) return
    try {
      actions.deserialize(target.data)
      toast.success(`${target.name} appliquée`)
    } catch (error) {
      console.error("Impossible d'appliquer la version", error)
      toast.error("Le chargement de la version a échoué")
    }
  }

  const handlePreview = (mode: PreviewMode) => {
    onPreviewModeChange(mode)
    toast.success(`Prévisualisation ${mode.toUpperCase()} activée`)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-lg font-semibold">{cvName}</h1>
        <p className="text-xs text-muted-foreground">Éditeur de gabarit multi-support</p>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Prévisualiser
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mode de prévisualisation</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlePreview("a4")}>A4</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePreview("mobile")}>Mobile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePreview("web")}>Visionneuse web</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Mode {previewMode.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreviewModeChange("a4")}>A4 (210x297mm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreviewModeChange("mobile")}>Mobile (360px)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreviewModeChange("web")}>Web viewer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              Versions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Versions locales</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleSaveVersion}>Sauvegarder une version</DropdownMenuItem>
            <DropdownMenuSeparator />
            {versions.length === 0 && <DropdownMenuItem disabled>Aucune version enregistrée</DropdownMenuItem>}
            {versions.map((version) => (
              <DropdownMenuItem key={version.id} onClick={() => handleLoadVersion(version.id)}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{version.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJSON}>Export JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={isExportingPdf}>
              {isExportingPdf ? "Génération PDF…" : "Export PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDocx} disabled={isExportingDocx}>
              {isExportingDocx ? "Génération DOCX…" : "Export DOCX"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2 } from "lucide-react"
import { generateCVSection, improveText, rephraseText, translateText, extractKeywords } from "@/lib/actions/ai"
import { toast } from "sonner"

interface AIAssistantDialogProps {
  mode: "generate" | "improve" | "rephrase" | "translate" | "keywords"
  initialText?: string
  context?: any
  onApply: (text: string) => void
}

export function AIAssistantDialog({ mode, initialText = "", context, onApply }: AIAssistantDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(initialText)
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState("openai/gpt-4o-mini")
  const [tone, setTone] = useState("professional")
  const [language, setLanguage] = useState("français")

  const titles: Record<string, string> = {
    generate: "Générer avec l'IA",
    improve: "Améliorer le texte",
    rephrase: "Reformuler",
    translate: "Traduire",
    keywords: "Extraire les mots-clés",
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      let result

      switch (mode) {
        case "generate":
          result = await generateCVSection(context?.section || "summary", context, model)
          break
        case "improve":
          result = await improveText(input, context?.context || "", model)
          break
        case "rephrase":
          result = await rephraseText(input, tone, model)
          break
        case "translate":
          result = await translateText(input, language, model)
          break
        case "keywords":
          result = await extractKeywords(input, model)
          if (result.success && result.keywords) {
            setOutput(result.keywords.join(", "))
            return
          }
          break
      }

      if (result?.success && result.text) {
        setOutput(result.text)
      } else {
        toast.error(result?.error || "Erreur lors de la génération")
      }
    } catch (error) {
      toast.error("Erreur lors de la génération")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    onApply(output)
    setOpen(false)
    setOutput("")
    toast.success("Texte appliqué avec succès")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          {titles[mode]}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Model selection */}
          <div className="space-y-2">
            <Label>Modèle IA</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini (Rapide)</SelectItem>
                <SelectItem value="openai/gpt-4o">GPT-4o (Puissant)</SelectItem>
                <SelectItem value="anthropic/claude-sonnet-4">Claude Sonnet 4</SelectItem>
                <SelectItem value="xai/grok-2-latest">Grok 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific options */}
          {mode === "rephrase" && (
            <div className="space-y-2">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="casual">Décontracté</SelectItem>
                  <SelectItem value="formal">Formel</SelectItem>
                  <SelectItem value="creative">Créatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "translate" && (
            <div className="space-y-2">
              <Label>Langue cible</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="français">Français</SelectItem>
                  <SelectItem value="anglais">Anglais</SelectItem>
                  <SelectItem value="espagnol">Espagnol</SelectItem>
                  <SelectItem value="allemand">Allemand</SelectItem>
                  <SelectItem value="italien">Italien</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input text (for improve, rephrase, translate, keywords) */}
          {mode !== "generate" && (
            <div className="space-y-2">
              <Label>Texte d'entrée</Label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Entrez le texte à traiter..."
                rows={6}
              />
            </div>
          )}

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={loading || (mode !== "generate" && !input)} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer
              </>
            )}
          </Button>

          {/* Output */}
          {output && (
            <div className="space-y-2">
              <Label>Résultat</Label>
              <Textarea value={output} onChange={(e) => setOutput(e.target.value)} rows={8} className="font-mono" />
              <Button onClick={handleApply} className="w-full">
                Appliquer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

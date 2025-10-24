"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, CheckCircle2 } from "lucide-react"
import { extractCVData } from "@/lib/actions/ai"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface CVImportDialogProps {
  onImport: (data: any) => void
}

export function CVImportDialog({ onImport }: CVImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [cvText, setCvText] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [step, setStep] = useState<"input" | "review">("input")

  const handleExtract = async () => {
    if (!cvText.trim()) {
      toast.error("Veuillez coller le contenu de votre CV")
      return
    }

    setLoading(true)
    try {
      const result = await extractCVData(cvText)

      if (result.success && result.data) {
        setExtractedData(result.data)
        setStep("review")
        toast.success("Données extraites avec succès")
      } else {
        toast.error(result.error || "Erreur lors de l'extraction")
      }
    } catch (error) {
      toast.error("Erreur lors de l'extraction des données")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onImport(extractedData)
    setOpen(false)
    setCvText("")
    setExtractedData(null)
    setStep("input")
    toast.success("Données importées avec succès")
  }

  const handleBack = () => {
    setStep("input")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importer un CV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer un CV existant</DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contenu du CV</Label>
              <Textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Collez le contenu de votre CV ici (texte brut)..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Copiez et collez le contenu de votre CV. L'IA extraira automatiquement les informations structurées.
              </p>
            </div>

            <Button onClick={handleExtract} disabled={loading || !cvText.trim()} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extraction en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extraire les données
                </>
              )}
            </Button>
          </div>
        )}

        {step === "review" && extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-900">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Données extraites avec succès</span>
            </div>

            {/* Personal Info */}
            <div className="space-y-2">
              <h3 className="font-semibold">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom:</span> {extractedData.personal?.firstName}{" "}
                  {extractedData.personal?.lastName}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {extractedData.personal?.email}
                </div>
                <div>
                  <span className="text-muted-foreground">Téléphone:</span> {extractedData.personal?.phone}
                </div>
                <div>
                  <span className="text-muted-foreground">Ville:</span> {extractedData.personal?.city}
                </div>
              </div>
            </div>

            {/* Experiences */}
            {extractedData.experiences?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Expériences ({extractedData.experiences.length})</h3>
                <div className="space-y-2">
                  {extractedData.experiences.slice(0, 3).map((exp: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{exp.position}</div>
                      <div className="text-muted-foreground">{exp.companyName}</div>
                    </div>
                  ))}
                  {extractedData.experiences.length > 3 && (
                    <Badge variant="secondary">+{extractedData.experiences.length - 3} autres</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {extractedData.education?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Formation ({extractedData.education.length})</h3>
                <div className="space-y-2">
                  {extractedData.education.slice(0, 2).map((edu: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{edu.degree}</div>
                      <div className="text-muted-foreground">{edu.institutionName}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {extractedData.skills?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Compétences ({extractedData.skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {extractedData.skills.slice(0, 10).map((skill: any, i: number) => (
                    <Badge key={i} variant="secondary">
                      {skill.skillName}
                    </Badge>
                  ))}
                  {extractedData.skills.length > 10 && (
                    <Badge variant="outline">+{extractedData.skills.length - 10}</Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1 bg-transparent">
                Retour
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirmer l'import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

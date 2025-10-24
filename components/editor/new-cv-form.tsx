"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCVFromTemplate } from "@/lib/actions/templates"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface NewCVFormProps {
  template: {
    id: string
    name: string
    description: string | null
    thumbnail_url: string | null
  }
}

export function NewCVForm({ template }: NewCVFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [cvName, setCvName] = useState(`Mon CV - ${template.name}`)
  const [cvDescription, setCvDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await createCVFromTemplate(template.id, cvName, cvDescription)

    if (result.error) {
      toast.error(result.error)
      setIsLoading(false)
    } else {
      toast.success("CV créé avec succès !")
      router.push(`/editor/${result.cvId}`)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Créer un nouveau CV</CardTitle>
        <CardDescription>Donnez un nom à votre CV basé sur le template "{template.name}"</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <div className="w-1/3">
              <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url || "/placeholder.svg"}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-muted-foreground">Aperçu</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cv_name">Nom du CV *</Label>
                <Input
                  id="cv_name"
                  required
                  value={cvName}
                  onChange={(e) => setCvName(e.target.value)}
                  placeholder="Ex: CV Développeur Senior"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv_description">Description (optionnel)</Label>
                <Textarea
                  id="cv_description"
                  value={cvDescription}
                  onChange={(e) => setCvDescription(e.target.value)}
                  placeholder="Décrivez l'objectif de ce CV..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 bg-transparent">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Création..." : "Créer mon CV"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

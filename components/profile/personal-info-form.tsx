"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateUserProfile } from "@/lib/actions/profile"
import { useState } from "react"
import { toast } from "sonner"
import { AIAssistantDialog } from "@/components/ai/ai-assistant-dialog"

interface PersonalInfoFormProps {
  initialData: {
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    postalCode?: string | null
    country?: string | null
    currentPosition?: string | null
    professionalSummary?: string | null
    linkedinUrl?: string | null
    portfolioUrl?: string | null
    githubUrl?: string | null
    websiteUrl?: string | null
  }
}

export function PersonalInfoForm({ initialData }: PersonalInfoFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(initialData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateUserProfile(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Profil mis à jour avec succès")
    }

    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription>Vos informations de base qui apparaîtront sur votre CV</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPosition">Poste actuel</Label>
            <Input
              id="currentPosition"
              value={formData.currentPosition || ""}
              onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
              placeholder="Ex: Développeur Full Stack"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="professionalSummary">Résumé professionnel</Label>
              <div className="flex gap-2">
                <AIAssistantDialog
                  mode="generate"
                  context={{ section: "summary", title: formData.currentPosition }}
                  onApply={(text) => setFormData({ ...formData, professionalSummary: text })}
                />
                {formData.professionalSummary && (
                  <>
                    <AIAssistantDialog
                      mode="improve"
                      initialText={formData.professionalSummary}
                      context={{ context: "résumé professionnel" }}
                      onApply={(text) => setFormData({ ...formData, professionalSummary: text })}
                    />
                    <AIAssistantDialog
                      mode="rephrase"
                      initialText={formData.professionalSummary}
                      onApply={(text) => setFormData({ ...formData, professionalSummary: text })}
                    />
                  </>
                )}
              </div>
            </div>
            <Textarea
              id="professionalSummary"
              value={formData.professionalSummary || ""}
              onChange={(e) => setFormData({ ...formData, professionalSummary: e.target.value })}
              placeholder="Décrivez brièvement votre parcours et vos compétences..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input
              id="postalCode"
              value={formData.postalCode || ""}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country || ""}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Liens professionnels</h4>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={formData.linkedinUrl || ""}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub</Label>
              <Input
                id="githubUrl"
                type="url"
                value={formData.githubUrl || ""}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl">Portfolio</Label>
              <Input
                id="portfolioUrl"
                type="url"
                value={formData.portfolioUrl || ""}
                onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Site web</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl || ""}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

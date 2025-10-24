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
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    postal_code?: string | null
    country?: string | null
    current_position?: string | null
    professional_summary?: string | null
    linkedin_url?: string | null
    portfolio_url?: string | null
    github_url?: string | null
    website_url?: string | null
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
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={formData.first_name || ""}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={formData.last_name || ""}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_position">Poste actuel</Label>
            <Input
              id="current_position"
              value={formData.current_position || ""}
              onChange={(e) => setFormData({ ...formData, current_position: e.target.value })}
              placeholder="Ex: Développeur Full Stack"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="professional_summary">Résumé professionnel</Label>
              <div className="flex gap-2">
                <AIAssistantDialog
                  mode="generate"
                  context={{ section: "summary", title: formData.current_position }}
                  onApply={(text) => setFormData({ ...formData, professional_summary: text })}
                />
                {formData.professional_summary && (
                  <>
                    <AIAssistantDialog
                      mode="improve"
                      initialText={formData.professional_summary}
                      context={{ context: "résumé professionnel" }}
                      onApply={(text) => setFormData({ ...formData, professional_summary: text })}
                    />
                    <AIAssistantDialog
                      mode="rephrase"
                      initialText={formData.professional_summary}
                      onApply={(text) => setFormData({ ...formData, professional_summary: text })}
                    />
                  </>
                )}
              </div>
            </div>
            <Textarea
              id="professional_summary"
              value={formData.professional_summary || ""}
              onChange={(e) => setFormData({ ...formData, professional_summary: e.target.value })}
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
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code || ""}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
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
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url || ""}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub</Label>
              <Input
                id="github_url"
                type="url"
                value={formData.github_url || ""}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Portfolio</Label>
              <Input
                id="portfolio_url"
                type="url"
                value={formData.portfolio_url || ""}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Site web</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url || ""}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
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

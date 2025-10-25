"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { addEducation, deleteEducation } from "@/lib/actions/profile"
import { GraduationCap, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface Education {
  id: string
  institution: string
  degree: string
  field: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  description: string | null
  location: string | null
}

interface EducationSectionProps {
  education: Education[]
}

export function EducationSection({ education }: EducationSectionProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    location: "",
    displayOrder: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await addEducation(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Formation ajoutée avec succès")
      setOpen(false)
      setFormData({
        institution: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        location: "",
        displayOrder: 0,
      })
    }

    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteEducation(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Formation supprimée")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Formations</CardTitle>
            <CardDescription>Votre parcours académique</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter une formation</DialogTitle>
                <DialogDescription>Ajoutez une nouvelle formation à votre profil</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="institution">Établissement *</Label>
                    <Input
                      id="institution"
                      required
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="degree">Diplôme *</Label>
                      <Input
                        id="degree"
                        required
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                        placeholder="Master, Licence, etc."
                      />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="field">Domaine d'études</Label>
                    <Input
                      id="field"
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      placeholder="Informatique, Marketing, etc."
                    />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Localisation</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      disabled={formData.isCurrent}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCurrent"
                    checked={formData.isCurrent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isCurrent: checked as boolean })}
                  />
                  <Label htmlFor="isCurrent" className="cursor-pointer">
                    Formation en cours
                  </Label>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Cours principaux, projets, mentions..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Ajout..." : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {education.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GraduationCap className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune formation ajoutée</p>
          </div>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu.id} className="flex items-start justify-between rounded-lg border p-4">
                <div className="flex-1">
                  <h4 className="font-semibold">{edu.degree}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  {edu.field && <p className="text-sm text-muted-foreground">{edu.field}</p>}
                  {edu.location && <p className="text-sm text-muted-foreground">{edu.location}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {edu.startDate} - {edu.isCurrent ? "En cours" : edu.endDate}
                  </p>
                  {edu.description && <p className="mt-2 text-sm">{edu.description}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(edu.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

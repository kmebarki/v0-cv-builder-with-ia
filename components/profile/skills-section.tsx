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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { addSkill, deleteSkill } from "@/lib/actions/profile"
import { Plus, X, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface Skill {
  id: string
  skill_name: string
  skill_level: string | null
  category: string | null
}

interface SkillsSectionProps {
  skills: Skill[]
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    skill_name: "",
    skill_level: "intermediate",
    category: "technical",
    display_order: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await addSkill(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Compétence ajoutée avec succès")
      setOpen(false)
      setFormData({
        skill_name: "",
        skill_level: "intermediate",
        category: "technical",
        display_order: 0,
      })
    }

    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteSkill(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Compétence supprimée")
    }
  }

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case "expert":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "advanced":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "beginner":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      default:
        return ""
    }
  }

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case "expert":
        return "Expert"
      case "advanced":
        return "Avancé"
      case "intermediate":
        return "Intermédiaire"
      case "beginner":
        return "Débutant"
      default:
        return ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compétences</CardTitle>
            <CardDescription>Vos compétences techniques et soft skills</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une compétence</DialogTitle>
                <DialogDescription>Ajoutez une nouvelle compétence à votre profil</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skill_name">Nom de la compétence *</Label>
                    <Input
                      id="skill_name"
                      required
                      value={formData.skill_name}
                      onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                      placeholder="React, Communication, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill_level">Niveau</Label>
                    <Select
                      value={formData.skill_level}
                      onValueChange={(value) => setFormData({ ...formData, skill_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Débutant</SelectItem>
                        <SelectItem value="intermediate">Intermédiaire</SelectItem>
                        <SelectItem value="advanced">Avancé</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technique</SelectItem>
                        <SelectItem value="soft">Soft Skills</SelectItem>
                        <SelectItem value="language">Langue</SelectItem>
                      </SelectContent>
                    </Select>
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
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune compétence ajoutée</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className={`group relative pr-8 ${getLevelColor(skill.skill_level)}`}
              >
                {skill.skill_name}
                {skill.skill_level && <span className="ml-1 text-xs">({getLevelLabel(skill.skill_level)})</span>}
                <button
                  onClick={() => handleDelete(skill.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xs p-0.5 opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

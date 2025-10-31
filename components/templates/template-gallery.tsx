"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Eye } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Template {
  id: string
  name: string
  description: string | null
  previewUrl: string | null
  templateType: string | null
  isActive: boolean
  usageCount: number
  categories: Array<{
    id: string
    name: string
  }>
  tags: Array<{
    id: string
    name: string
  }>
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface Tag {
  id: string
  name: string
}

interface TemplateGalleryProps {
  templates: Template[]
  categories: Category[]
  tags: Tag[]
}

export function TemplateGallery({ templates, categories, tags }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filteredTemplates = templates.filter((template) => {
    // Filter by category
    if (selectedCategory !== "all") {
      const hasCategory = template.categories.some((category) => category.name === selectedCategory)
      if (!hasCategory) return false
    }

    // Filter by search query
    if (searchQuery) {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      const templateTags = template.tags.map((tag) => tag.name)
      const hasAllTags = selectedTags.every((tag) => templateTags.includes(tag))
      if (!hasAllTags) return false
    }

    return true
  })

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) => (prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]))
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.name}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.name) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredTemplates.length} template{filteredTemplates.length > 1 ? "s" : ""} trouvé
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-lg font-medium">Aucun template trouvé</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier vos filtres</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-muted">
                {template.previewUrl ? (
                  <img
                    src={template.previewUrl || "/placeholder.svg"}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">Aperçu non disponible</p>
                  </div>
                )}
                <Badge className="absolute right-2 top-2" variant="outline">
                      {template.templateType?.toUpperCase() ?? "STANDARD"}
                    </Badge>
                  </div>
                  <CardHeader>
                <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Eye className="mr-2 h-4 w-4" />
                      Aperçu
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{template.name}</DialogTitle>
                      <DialogDescription>{template.description}</DialogDescription>
                    </DialogHeader>
                    <div className="aspect-[3/4] bg-muted">
                      {template.previewUrl ? (
                        <img
                          src={template.previewUrl || "/placeholder.svg"}
                          alt={template.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-muted-foreground">Aperçu non disponible</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" className="flex-1" asChild>
                  <Link href={`/editor/new?template=${template.id}`}>Utiliser</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

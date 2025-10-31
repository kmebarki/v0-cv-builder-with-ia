"use client"

import { useEffect, useMemo, useState } from "react"
import { useEditor, Element } from "@craftjs/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ImageNode } from "@/components/editor/nodes/image-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Upload } from "lucide-react"

interface MediaAssetTag {
  id: string
  label: string
  slug: string
}

interface MediaAsset {
  id: string
  name: string
  description?: string | null
  type?: string | null
  url: string
  thumbnailUrl?: string | null
  metadata?: Record<string, any>
  tags: MediaAssetTag[]
  createdAt: string
  updatedAt: string
}

export function MediaLibrary() {
  const { connectors } = useEditor()
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [tags, setTags] = useState<MediaAssetTag[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [uploading, setUploading] = useState(false)

  const loadAssets = async (override?: { search?: string; tag?: string | null }) => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (override?.search ?? search) {
        query.set("search", override?.search ?? search)
      }
      const activeTag = override?.tag ?? selectedTag
      if (activeTag) {
        query.set("tag", activeTag)
      }
      const response = await fetch(`/api/media-assets?${query.toString()}`)
      if (!response.ok) {
        throw new Error("failed")
      }
      const payload = await response.json()
      setAssets(payload.items ?? [])
      setTags(payload.tags ?? [])
    } catch (error) {
      console.error("Unable to load assets", error)
      toast.error("Impossible de charger la médiathèque")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableTags = useMemo(() => {
    return tags.map((tag) => ({ value: tag.slug, label: tag.label }))
  }, [tags])

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choisissez un fichier")
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)
      if (name.trim().length > 0) {
        formData.append("name", name.trim())
      }
      if (description.trim().length > 0) {
        formData.append("description", description.trim())
      }
      tagInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .forEach((value) => formData.append("tags", value))

      const response = await fetch("/api/media-assets", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("upload_failed")
      }

      toast.success("Média importé")
      setFile(null)
      setName("")
      setDescription("")
      setTagInput("")
      setUploadOpen(false)
      await loadAssets({})
    } catch (error) {
      console.error("Unable to upload media", error)
      toast.error("L'upload a échoué")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce média ?")) {
      return
    }
    try {
      const response = await fetch(`/api/media-assets/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("delete_failed")
      }
      toast.success("Média supprimé")
      await loadAssets({})
    } catch (error) {
      console.error("Unable to delete media", error)
      toast.error("Impossible de supprimer le média")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un média"
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadAssets({ search })}
            disabled={loading}
            aria-label="Rechercher"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Ajouter un média</DialogTitle>
              <DialogDescription>Importez des images, icônes ou ressources SVG dans la bibliothèque.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fichier</Label>
                <Input type="file" accept="image/*,.svg,.png,.jpg,.jpeg,.gif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom du média" />
                </div>
                <div className="space-y-2">
                  <Label>Tags (séparés par des virgules)</Label>
                  <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="icône, photo, logo" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Optionnel : décrivez l'usage du média"
                />
              </div>
              <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="h-[340px] overflow-y-auto rounded-md border">
        <div className="space-y-6 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTag(null)
                loadAssets({ tag: null }).catch(() => {})
              }}
            >
              Tous
            </Badge>
            {availableTags.map((tag) => (
              <Badge
                key={tag.value}
                variant={selectedTag === tag.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedTag(tag.value)
                  loadAssets({ tag: tag.value }).catch(() => {})
                }}
              >
                {tag.label}
              </Badge>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-md border border-border/60 bg-background p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{asset.name}</p>
                    {asset.description && <p className="text-xs text-muted-foreground">{asset.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      ref={(ref) =>
                        ref &&
                        connectors.create(
                          ref,
                          <Element is={ImageNode} src={asset.url} alt={asset.name} width={180} height={180} />,
                        )
                      }
                    >
                      Insérer
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)}>
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preview">Aperçu</TabsTrigger>
                    <TabsTrigger value="bindings">Bindings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="pt-3">
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.name} className="max-h-36 object-contain" />
                    </div>
                  </TabsContent>
                  <TabsContent value="bindings" className="pt-3">
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Insertion rapide</p>
                      <div
                        ref={(ref) =>
                          ref &&
                          connectors.create(
                            ref,
                            <Element
                              is={VariableTextNode}
                              variablePath=""
                              fallbackText={asset.name}
                              fontSize={14}
                              mode="template"
                              template={`<img src=\"${asset.url}\" alt=\"${asset.name}\"/>`}
                            />,
                          )
                        }
                        className="cursor-pointer rounded-md border border-dashed p-2 text-center"
                      >
                        Insérer comme template HTML
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="mt-3 flex flex-wrap gap-1">
                  {asset.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-[11px]">
                      {tag.label}
                    </Badge>
                  ))}
                  {asset.tags.length === 0 && <span className="text-xs text-muted-foreground">Aucun tag</span>}
                </div>
              </div>
            ))}
            {!loading && assets.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aucun média ne correspond à la recherche.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.5 2a1 1 0 00-.894.553L7.118 3H4a1 1 0 000 2h.278l.723 10.143A2 2 0 007.994 17h4.012a2 2 0 001.993-1.857L14.722 5H15a1 1 0 100-2h-3.118l-.488-.447A1 1 0 0010.5 2h-2zM9 7a1 1 0 10-2 0v6a1 1 0 102 0V7zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V7z"
        clipRule="evenodd"
      />
    </svg>
  )
}

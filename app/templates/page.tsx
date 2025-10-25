import { redirect } from "next/navigation"
import { UserNav } from "@/components/user-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TemplateGallery } from "@/components/templates/template-gallery"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export default async function TemplatesPage() {
  const session = await requireSession()

  if (!session) {
    redirect("/auth/login")
  }

  const { user } = session

  const rawTemplates = await prisma.cvTemplate.findMany({
    where: { isActive: true },
    include: {
      categories: true,
      tags: true,
    },
    orderBy: { usageCount: "desc" },
  })

  const categories = await prisma.templateCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const tags = await prisma.templateTag.findMany({
    orderBy: { name: "asc" },
  })

  const templates = rawTemplates.map((template) => ({
    ...template,
    previewUrl: template.previewUrl,
    usageCount: template.usageCount,
    categories: template.categories.map((category) => ({ id: category.id, name: category.name })),
    tags: template.tags.map((tag) => ({ id: tag.id, name: tag.name })),
  }))

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Templates CV</h1>
          </div>
          <UserNav email={user.email || ""} />
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Choisissez votre template</h2>
          <p className="text-muted-foreground">Sélectionnez un template professionnel pour créer votre CV</p>
        </div>

        <TemplateGallery templates={templates} categories={categories} tags={tags} />
      </main>
    </div>
  )
}

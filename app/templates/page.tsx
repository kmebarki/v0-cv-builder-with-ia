import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserNav } from "@/components/user-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TemplateGallery } from "@/components/templates/template-gallery"

export default async function TemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  // Fetch templates with their categories and tags
  const { data: templates } = await supabase
    .from("cv_templates")
    .select(
      `
      *,
      template_category_mapping(
        cv_template_categories(*)
      ),
      template_tag_mapping(
        cv_template_tags(*)
      )
    `,
    )
    .eq("is_active", true)
    .order("usage_count", { ascending: false })

  const { data: categories } = await supabase
    .from("cv_template_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order")

  const { data: tags } = await supabase.from("cv_template_tags").select("*").order("name")

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

        <TemplateGallery templates={templates || []} categories={categories || []} tags={tags || []} />
      </main>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserNav } from "@/components/user-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function MyCVsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: cvs } = await supabase
    .from("user_cvs")
    .select(
      `
      *,
      cv_templates(name)
    `,
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

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
            <h1 className="text-xl font-bold">Mes CV</h1>
          </div>
          <UserNav email={user.email || ""} />
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Mes CV</h2>
            <p className="text-muted-foreground">Gérez et modifiez vos CV</p>
          </div>
          <Button asChild>
            <Link href="/templates">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau CV
            </Link>
          </Button>
        </div>

        {!cvs || cvs.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[400px] flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Aucun CV créé</h3>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Commencez par créer votre premier CV à partir d'un template
              </p>
              <Button asChild>
                <Link href="/templates">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer mon premier CV
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <Card key={cv.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{cv.cv_name}</CardTitle>
                    {cv.is_default && <Badge variant="secondary">Par défaut</Badge>}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {cv.cv_description || "Aucune description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Template: {cv.cv_templates?.name || "Personnalisé"}</p>
                    <p>Version: {cv.version}</p>
                    <p>Modifié: {new Date(cv.updated_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                    <Link href={`/editor/${cv.id}`}>Modifier</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/cv/${cv.id}/export`}>Exporter</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

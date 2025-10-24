import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Sparkles, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">CV Builder IA</h1>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-5xl font-bold">Créez des CV professionnels avec l'IA</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Utilisez notre éditeur intelligent pour créer des CV percutants en quelques minutes. L'IA vous aide à
            optimiser chaque section.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/signup">Commencer gratuitement</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/templates">Voir les templates</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <h3 className="mb-12 text-center text-3xl font-bold">Fonctionnalités principales</h3>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h4 className="mb-2 text-xl font-semibold">Templates professionnels</h4>
                <p className="text-muted-foreground">
                  Choisissez parmi une large sélection de templates modernes et élégants
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h4 className="mb-2 text-xl font-semibold">Assistant IA</h4>
                <p className="text-muted-foreground">L'IA génère, améliore et optimise le contenu de votre CV</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="mb-2 text-xl font-semibold">Éditeur visuel</h4>
                <p className="text-muted-foreground">Personnalisez chaque élément avec notre éditeur drag & drop</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 CV Builder IA. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}

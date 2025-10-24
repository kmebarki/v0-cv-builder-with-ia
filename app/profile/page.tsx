import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PersonalInfoForm } from "@/components/profile/personal-info-form"
import { ExperienceSection } from "@/components/profile/experience-section"
import { EducationSection } from "@/components/profile/education-section"
import { SkillsSection } from "@/components/profile/skills-section"
import { UserNav } from "@/components/user-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CVImportDialog } from "@/components/ai/cv-import-dialog"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  const { data: education } = await supabase
    .from("user_education")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order")

  const { data: experience } = await supabase
    .from("user_experience")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order")

  const { data: skills } = await supabase.from("user_skills").select("*").eq("user_id", user.id).order("display_order")

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
            <h1 className="text-xl font-bold">Mon Profil</h1>
          </div>
          <UserNav email={user.email || ""} />
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-6 flex justify-end">
          <CVImportDialog
            onImport={async (data) => {
              "use server"
              // This will be handled client-side
            }}
          />
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Informations</TabsTrigger>
            <TabsTrigger value="experience">Expériences</TabsTrigger>
            <TabsTrigger value="education">Formations</TabsTrigger>
            <TabsTrigger value="skills">Compétences</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalInfoForm initialData={profile || {}} />
          </TabsContent>

          <TabsContent value="experience">
            <ExperienceSection experiences={experience || []} />
          </TabsContent>

          <TabsContent value="education">
            <EducationSection education={education || []} />
          </TabsContent>

          <TabsContent value="skills">
            <SkillsSection skills={skills || []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { PersonalInfoForm } from "@/components/profile/personal-info-form"
import { ExperienceSection } from "@/components/profile/experience-section"
import { EducationSection } from "@/components/profile/education-section"
import { SkillsSection } from "@/components/profile/skills-section"
import { SecuritySection } from "@/components/profile/security-section"
import { UserNav } from "@/components/user-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CVImportDialog } from "@/components/ai/cv-import-dialog"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export default async function ProfilePage() {
  const session = await requireSession()

  if (!session) {
    redirect("/auth/login")
  }

  const { user } = session

  const profile = await prisma.user.findUnique({ where: { id: user.id } })
  const education = await prisma.education.findMany({
    where: { userId: user.id },
    orderBy: { displayOrder: "asc" },
  })
  const experience = await prisma.experience.findMany({
    where: { userId: user.id },
    orderBy: { displayOrder: "asc" },
  })
  const skills = await prisma.skill.findMany({
    where: { userId: user.id },
    orderBy: { displayOrder: "asc" },
  })
  const twoFactorEnabled =
    (await prisma.authenticator.count({ where: { userId: user.id, isPrimary: true } })) > 0

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
            <TabsTrigger value="security">Sécurité</TabsTrigger>
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

          <TabsContent value="security">
            <SecuritySection
              initialTwoFactorEnabled={twoFactorEnabled}
              emailVerified={Boolean(profile?.emailVerifiedAt)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

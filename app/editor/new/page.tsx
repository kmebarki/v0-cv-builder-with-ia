import { redirect } from "next/navigation"
import { NewCVForm } from "@/components/editor/new-cv-form"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export default async function NewCVPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams
  const session = await requireSession()

  if (!session) {
    redirect("/auth/login")
  }

  const templateId = params.template

  if (!templateId) {
    redirect("/templates")
  }

  const template = await prisma.cvTemplate.findUnique({ where: { id: templateId } })

  if (!template) {
    redirect("/templates")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <NewCVForm template={template} />
    </div>
  )
}

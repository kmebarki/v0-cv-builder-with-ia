import { redirect } from "next/navigation"
import { CVEditor } from "@/components/editor/cv-editor"
import { saveCVStructure } from "@/lib/actions/cv"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()

  if (!session) {
    redirect("/auth/login")
  }

  const cv = await prisma.userCv.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!cv) {
    redirect("/my-cvs")
  }

  const handleSave = async (structure: string) => {
    "use server"
    await saveCVStructure(id, structure)
  }

  return <CVEditor cvId={cv.id} cvName={cv.name} initialStructure={cv.structure} onSave={handleSave} />
}

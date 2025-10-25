"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth/session"

export async function saveCVStructure(cvId: string, structure: string) {
  const user = await requireUser()
  if (!user) {
    throw new Error("Non authentifié")
  }

  const parsedStructure = JSON.parse(structure)

  const cv = await prisma.userCv.findUnique({ where: { id: cvId } })
  if (!cv || cv.userId !== user.id) {
    throw new Error("CV introuvable")
  }

  await prisma.userCv.update({
    where: { id: cvId },
    data: {
      structure: parsedStructure,
      version: cv.version + 1,
    },
  })

  revalidatePath(`/editor/${cvId}`)
}

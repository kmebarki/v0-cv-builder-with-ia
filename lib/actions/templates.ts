"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth/session"

export async function createCVFromTemplate(templateId: string, cvName: string, cvDescription?: string) {
  const user = await requireUser()
  if (!user) {
    return { error: "Non authentifié" }
  }

  const template = await prisma.cvTemplate.findUnique({ where: { id: templateId } })
  if (!template) {
    return { error: "Template introuvable" }
  }

  const newCv = await prisma.userCv.create({
    data: {
      userId: user.id,
      templateId,
      name: cvName,
      description: cvDescription ?? null,
      structure: template.structure ?? {},
    },
  })

  await prisma.cvTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } },
  })

  revalidatePath("/my-cvs")
  return { success: true, cvId: newCv.id }
}

export async function deleteCv(cvId: string) {
  const user = await requireUser()
  if (!user) {
    return { error: "Non authentifié" }
  }

  const cv = await prisma.userCv.findUnique({ where: { id: cvId } })
  if (!cv || cv.userId !== user.id) {
    return { error: "CV introuvable" }
  }

  await prisma.userCv.delete({ where: { id: cvId } })
  revalidatePath("/my-cvs")
  return { success: true }
}

export async function updateCvMetadata(cvId: string, data: { name?: string; description?: string }) {
  const user = await requireUser()
  if (!user) {
    return { error: "Non authentifié" }
  }

  const cv = await prisma.userCv.findUnique({ where: { id: cvId } })
  if (!cv || cv.userId !== user.id) {
    return { error: "CV introuvable" }
  }

  await prisma.userCv.update({
    where: { id: cvId },
    data: {
      name: data.name ?? cv.name,
      description: data.description ?? cv.description,
    },
  })

  revalidatePath("/my-cvs")
  return { success: true }
}

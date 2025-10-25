"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth/session"
import type { Prisma } from "@prisma/client"

type UserProfileUpdate = Prisma.UserUpdateInput

type ExperienceInput = {
  company: string
  position: string
  startDate?: string | null
  endDate?: string | null
  isCurrent?: boolean
  description?: string | null
  location?: string | null
  displayOrder?: number
}

type EducationInput = {
  institution: string
  degree: string
  field?: string | null
  startDate?: string | null
  endDate?: string | null
  description?: string | null
  location?: string | null
  displayOrder?: number
}

type SkillInput = {
  name: string
  level?: string | null
  category?: string | null
  displayOrder?: number
}

export async function updateUserProfile(data: UserProfileUpdate) {
  const user = await requireUser()
  if (!user) {
    return { error: "Non authentifié" }
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function addEducation(data: EducationInput) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  await prisma.education.create({
    data: {
      userId: user.id,
      institution: data.institution,
      degree: data.degree,
      field: data.field ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: data.description ?? null,
      location: data.location ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function updateEducation(id: string, data: EducationInput) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  const record = await prisma.education.findUnique({ where: { id } })
  if (!record || record.userId !== user.id) {
    return { error: "Formation introuvable" }
  }

  await prisma.education.update({
    where: { id },
    data: {
      institution: data.institution,
      degree: data.degree,
      field: data.field ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: data.description ?? null,
      location: data.location ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteEducation(id: string) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  const record = await prisma.education.findUnique({ where: { id } })
  if (!record || record.userId !== user.id) {
    return { error: "Formation introuvable" }
  }

  await prisma.education.delete({
    where: { id },
  })
  revalidatePath("/profile")
  return { success: true }
}

export async function addExperience(data: ExperienceInput) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  await prisma.experience.create({
    data: {
      userId: user.id,
      company: data.company,
      position: data.position,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isCurrent: data.isCurrent ?? false,
      description: data.description ?? null,
      location: data.location ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function updateExperience(id: string, data: ExperienceInput) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  const record = await prisma.experience.findUnique({ where: { id } })
  if (!record || record.userId !== user.id) {
    return { error: "Expérience introuvable" }
  }

  await prisma.experience.update({
    where: { id },
    data: {
      company: data.company,
      position: data.position,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isCurrent: data.isCurrent ?? false,
      description: data.description ?? null,
      location: data.location ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteExperience(id: string) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  const record = await prisma.experience.findUnique({ where: { id } })
  if (!record || record.userId !== user.id) {
    return { error: "Expérience introuvable" }
  }

  await prisma.experience.delete({ where: { id } })
  revalidatePath("/profile")
  return { success: true }
}

export async function addSkill(data: SkillInput) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  await prisma.skill.create({
    data: {
      userId: user.id,
      name: data.name,
      level: data.level ?? null,
      category: data.category ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  })

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteSkill(id: string) {
  const user = await requireUser()
  if (!user) return { error: "Non authentifié" }

  const record = await prisma.skill.findUnique({ where: { id } })
  if (!record || record.userId !== user.id) {
    return { error: "Compétence introuvable" }
  }

  await prisma.skill.delete({ where: { id } })
  revalidatePath("/profile")
  return { success: true }
}

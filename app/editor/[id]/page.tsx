import { redirect } from "next/navigation"
import { CVEditor } from "@/components/editor/cv-editor"
import { saveCVStructure } from "@/lib/actions/cv"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { getAdminFieldValues, mergeAdminFields } from "@/lib/editor/admin-fields"
import {
  getAdminFieldRuntime,
  serializeRuntime,
  validateAdminDataWithFields,
} from "@/lib/editor/admin-field-runtime"
import { getDesignTokenSet } from "@/lib/editor/design-tokens-store"

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()

  if (!session) {
    redirect("/auth/login")
  }

  const cv = await prisma.userCv.findFirst({
    where: { id, userId: session.user.id },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!cv) {
    redirect("/my-cvs")
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      experiences: { orderBy: { startDate: "desc" } },
      education: { orderBy: { startDate: "desc" } },
      skills: { orderBy: { displayOrder: "asc" } },
    },
  })

  const [tokenSet, runtime] = await Promise.all([
    getDesignTokenSet(),
    getAdminFieldRuntime(),
  ])

  const skills = profile?.skills ?? []
  const languageSkills = skills.filter((skill) => skill.category && /lang/i.test(skill.category))
  const interestSkills = skills.filter((skill) =>
    skill.category && /(hobby|interest|centre|intérêt)/i.test(skill.category),
  )

  const skillGroups = skills.reduce<Record<string, { name: string; level: string | null }[]>>((acc, skill) => {
    const groupKey = skill.category?.trim() || "Autres"
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push({
      name: skill.name,
      level: skill.level ?? null,
    })
    return acc
  }, {})

  const baseCvData = {
    user: profile && {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      postalCode: profile.postalCode,
      country: profile.country,
      currentPosition: profile.currentPosition,
      professionalSummary: profile.professionalSummary,
      avatarUrl: profile.avatarUrl,
      social: {
        linkedin: profile.linkedinUrl,
        github: profile.githubUrl,
        website: profile.websiteUrl,
        portfolio: profile.portfolioUrl,
      },
    },
    experiences: profile?.experiences ?? [],
    education: profile?.education ?? [],
    skills,
    languages: languageSkills.map((skill) => ({ name: skill.name, level: skill.level })),
    interests: interestSkills.map((skill) => skill.name),
    skillGroups,
    admin: {},
  }

  const adminFieldValues = await getAdminFieldValues(session.user.id)
  const cvData = mergeAdminFields(baseCvData, adminFieldValues)

  for (const field of runtime.fields) {
    if (!Object.prototype.hasOwnProperty.call(cvData.admin, field.key)) {
      cvData.admin[field.key] = null
    }
  }

  const validation = validateAdminDataWithFields(runtime.fields, cvData.admin)

  if (!validation.success) {
    console.warn("Admin field validation issues", validation.errors)
  }

  const handleSave = async (structure: string) => {
    "use server"
    await saveCVStructure(id, structure)
  }

  return (
    <CVEditor
      cvId={cv.id}
      cvName={cv.name}
      initialStructure={cv.structure}
      cvData={cvData}
      adminRuntime={serializeRuntime(runtime)!}
      tokens={tokenSet.tokens}
      tokenSource={tokenSet.source}
      onSave={handleSave}
    />
  )
}

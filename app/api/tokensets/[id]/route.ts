import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  definition: z.any().optional(),
  modes: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional(),
})

function serializeTokenSet(tokenSet: any) {
  return {
    id: tokenSet.id,
    name: tokenSet.name,
    description: tokenSet.description,
    version: tokenSet.version,
    definition: tokenSet.definition,
    modes: tokenSet.modes ?? {},
    isActive: tokenSet.isActive,
    createdAt: tokenSet.createdAt,
    updatedAt: tokenSet.updatedAt,
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const set = await prisma.designTokenSet.findUnique({ where: { id: params.id } })
  if (!set) {
    return NextResponse.json({ error: "Token set not found" }, { status: 404 })
  }
  return NextResponse.json(serializeTokenSet(set))
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const payload = updateSchema.parse(body)

    const existing = await prisma.designTokenSet.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Token set not found" }, { status: 404 })
    }

    if (payload.isActive) {
      await prisma.designTokenSet.updateMany({
        data: { isActive: false },
        where: { isActive: true, NOT: { id: params.id } },
      })
    }

    const nextVersion =
      payload.version ??
      (payload.definition || payload.modes
        ? existing.version + 1
        : existing.version)

    const updated = await prisma.designTokenSet.update({
      where: { id: params.id },
      data: {
        name: payload.name ?? existing.name,
        description: payload.description ?? existing.description,
        definition: payload.definition ?? existing.definition,
        modes: payload.modes ?? existing.modes,
        version: nextVersion,
        isActive: payload.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json(serializeTokenSet(updated))
  } catch (error: any) {
    console.error("Failed to update token set", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to update token set" }, { status: 500 })
  }
}

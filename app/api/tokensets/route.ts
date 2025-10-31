import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const tokenDefinitionSchema = z.object({
  colors: z.record(z.string()).default({}),
  fonts: z
    .record(
      z.object({
        family: z.string(),
        weight: z.number().default(400),
        lineHeight: z.number().default(1.4),
      }),
    )
    .default({}),
  fontSizes: z
    .record(
      z.object({
        size: z.number(),
        lineHeight: z.number().default(1.4),
      }),
    )
    .default({}),
  spacing: z.record(z.number()).default({}),
  radii: z.record(z.number()).default({}),
  shadows: z.record(z.string()).default({}),
  themes: z
    .record(
      z.object({
        name: z.string().default(""),
        surface: z.string(),
        background: z.string(),
        text: z.string(),
        subtleText: z.string(),
        divider: z.string(),
      }),
    )
    .default({}),
  aliases: z.record(z.string()).default({}),
})

const tokenModesSchema = z.record(z.string(), z.any()).default({})

const basePayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: tokenDefinitionSchema,
  modes: tokenModesSchema.optional(),
  isActive: z.boolean().optional(),
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

export async function GET() {
  const sets = await prisma.designTokenSet.findMany({
    orderBy: [{ isActive: "desc" }, { version: "desc" }],
  })

  return NextResponse.json({
    items: sets.map(serializeTokenSet),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = basePayloadSchema.parse(body)

    const latest = await prisma.designTokenSet.aggregate({
      _max: { version: true },
    })
    const nextVersion = (latest._max.version ?? 0) + 1

    if (payload.isActive) {
      await prisma.designTokenSet.updateMany({
        data: { isActive: false },
        where: { isActive: true },
      })
    }

    const created = await prisma.designTokenSet.create({
      data: {
        name: payload.name,
        description: payload.description,
        version: nextVersion,
        definition: payload.definition,
        modes: payload.modes,
        isActive: payload.isActive ?? false,
      },
    })

    return NextResponse.json(serializeTokenSet(created), { status: 201 })
  } catch (error: any) {
    console.error("Failed to create token set", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to create token set" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { promises as fs } from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth/session"
import { auth } from "@/lib/auth/server"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

async function ensureEditor() {
  const session = await requireSession()
  if (!session) {
    return { error: NextResponse.json({ error: "Authentification requise" }, { status: 401 }) }
  }

  const permissions = await requireAdminApi(session.user.id, ["admin", "editor"])
  if (!permissions.success) {
    return { error: NextResponse.json({ error: permissions.error ?? "Accès refusé" }, { status: 403 }) }
  }

  return { session }
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function syncTags(assetId: string, tags: string[]) {
  const cleaned = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => ({ label: tag, slug: makeSlug(tag) })),
    ),
  )

  await prisma.mediaAssetTag.deleteMany({ where: { assetId } })

  for (const tag of cleaned) {
    const stored = await prisma.mediaTag.upsert({
      where: { slug: tag.slug },
      create: { label: tag.label, slug: tag.slug },
      update: { label: tag.label },
    })

    await prisma.mediaAssetTag.create({
      data: {
        assetId,
        tagId: stored.id,
      },
    })
  }
}

function serializeAsset(asset: any) {
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description,
    type: asset.type,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    metadata: asset.metadata,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    tags: asset.tags?.map((entry: any) => ({ id: entry.tag.id, label: entry.tag.label, slug: entry.tag.slug })) ?? [],
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const guard = await ensureEditor()
  if ("error" in guard) {
    return guard.error
  }

  const payload = updateSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.message }, { status: 400 })
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: { tags: { include: { tag: true } } },
  })
  if (!asset) {
    return NextResponse.json({ error: "Média introuvable" }, { status: 404 })
  }

  if (asset.userId !== guard.session.user.id) {
    const allowed = await requireAdminApi(guard.session.user.id, ["admin"])
    if (!allowed.success) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: params.id },
    data: {
      name: payload.data.name ?? asset.name,
      description: payload.data.description ?? asset.description,
    },
    include: { tags: { include: { tag: true } } },
  })

  if (payload.data.tags) {
    await syncTags(updated.id, payload.data.tags)
  }

  const refreshed = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: { tags: { include: { tag: true } } },
  })

  return NextResponse.json(serializeAsset(refreshed))
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const guard = await ensureEditor()
  if ("error" in guard) {
    return guard.error
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id: params.id } })
  if (!asset) {
    return NextResponse.json({ error: "Média introuvable" }, { status: 404 })
  }

  if (asset.userId !== guard.session.user.id) {
    const allowed = await requireAdminApi(guard.session.user.id, ["admin"])
    if (!allowed.success) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
  }

  if (asset.url?.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", asset.url.replace(/^\//, ""))
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn("Unable to remove media file", error)
    }
  }

  await prisma.mediaAssetTag.deleteMany({ where: { assetId: params.id } })
  await prisma.mediaAsset.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

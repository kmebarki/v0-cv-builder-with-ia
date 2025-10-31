import { NextResponse } from "next/server"
import { z } from "zod"
import { promises as fs } from "fs"
import path from "path"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
import { requireEditorOrAdminApi } from "@/lib/auth/guards"


export const runtime = 'nodejs'
export const revalidate = 0
export const dynamic = 'force-dynamic'

const uploadDirectory = path.join(process.cwd(), "public", "uploads")

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  url: z.string().url().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return [] as string[]
      return Array.isArray(value) ? value : value.split(",")
    }),
})

async function ensureEditor() {
  // S'appuie sur le guard unifié: autorise admin OU editor
  const gate = await requireEditorOrAdminApi()
  if ("error" in gate) {
    return { error: gate.error }
  }
  return { session: gate.session }
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

export async function GET(request: Request) {
  const guard = await ensureEditor()
  if ("error" in guard) {
    return guard.error
  }

  const url = new URL(request.url)
  const parsedQuery = querySchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
  })

  const where: any = { userId: guard.session.user.id }
  if (parsedQuery.search) {
    where.OR = [
      { name: { contains: parsedQuery.search, mode: "insensitive" } },
      { description: { contains: parsedQuery.search, mode: "insensitive" } },
    ]
  }
  if (parsedQuery.tag) {
    where.tags = {
      some: {
        tag: {
          slug: parsedQuery.tag,
        },
      },
    }
  }

  const [items, total, tags] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (parsedQuery.page - 1) * parsedQuery.pageSize,
      take: parsedQuery.pageSize,
    }),
    prisma.mediaAsset.count({ where }),
    prisma.mediaTag.findMany({ orderBy: { label: "asc" } }),
  ])

  return NextResponse.json({
    items: items.map(serializeAsset),
    total,
    page: parsedQuery.page,
    pageSize: parsedQuery.pageSize,
    tags,
  })
}

export async function POST(request: Request) {
  const guard = await ensureEditor()
  if ("error" in guard) {
    return guard.error
  }

  const contentType = request.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      if (!file) {
        return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
      }

      const payload = createSchema.parse({
        name: formData.get("name") ?? file.name,
        description: formData.get("description") ?? undefined,
        type: formData.get("type") ?? file.type,
        tags: formData
          .getAll("tags")
          .map((entry) => (typeof entry === "string" ? entry : String((entry as File).name ?? ""))),
      })

      await fs.mkdir(uploadDirectory, { recursive: true })
      const extension = path.extname(file.name || "") || ".bin"
      const fileName = `${nanoid()}${extension}`
      const filePath = path.join(uploadDirectory, fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      const asset = await prisma.mediaAsset.create({
        data: {
          name: payload.name,
          description: payload.description,
          type: payload.type || file.type,
          userId: guard.session.user.id,
          url: `/uploads/${fileName}`,
          metadata: {
            size: file.size,
            originalName: file.name,
            type: file.type,
          },
        },
        include: { tags: { include: { tag: true } } },
      })

      if (payload.tags.length > 0) {
        await syncTags(asset.id, payload.tags)
      }

      const refreshed = await prisma.mediaAsset.findUnique({
        where: { id: asset.id },
        include: { tags: { include: { tag: true } } },
      })

      return NextResponse.json(serializeAsset(refreshed), { status: 201 })
    }

    const json = await request.json()
    const payload = createSchema.parse(json)
    if (!payload.url) {
      return NextResponse.json({ error: "L'URL du média est obligatoire sans fichier" }, { status: 400 })
    }

    const created = await prisma.mediaAsset.create({
      data: {
        name: payload.name,
        description: payload.description,
        type: payload.type ?? "custom",
        userId: guard.session.user.id,
        url: payload.url,
      },
      include: { tags: { include: { tag: true } } },
    })

    if (payload.tags.length > 0) {
      await syncTags(created.id, payload.tags)
    }

    const refreshed = await prisma.mediaAsset.findUnique({
      where: { id: created.id },
      include: { tags: { include: { tag: true } } },
    })

    return NextResponse.json(serializeAsset(refreshed), { status: 201 })
  } catch (error: any) {
    console.error("Failed to upload media asset", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Impossible d'enregistrer le média" }, { status: 500 })
  }
}

"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth/server"
import { getRequestContext } from "@/lib/auth/context"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

const SESSION_COOKIE =
  process.env.BETTERAUTH_SESSION_COOKIE ?? "betterauth.session-token"

async function getSessionTokenLocal(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? null
}

export async function signOut() {
  const context = await getRequestContext()
  const token = await getSessionTokenLocal()
  await auth.logout(context, token ?? undefined)
  revalidatePath("/", "layout")
  redirect("/")
}

export async function getCurrentUser() {
  const context = await getRequestContext()
  const token = await getSessionTokenLocal()
  const session = await auth.getSession(token, context)
  if (!session.success || !session.data) return null
  return session.data.user
}

export async function getUserProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
    })
    return profile
  } catch {
    return null
  }
}

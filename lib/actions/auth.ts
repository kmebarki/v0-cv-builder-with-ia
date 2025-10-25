"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth/server"
import { getRequestContext, getSessionToken } from "@/lib/auth/context"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"

export async function signOut() {
  const context = getRequestContext()
  const token = getSessionToken(env.betterAuth.sessionCookieName)
  await auth.logout(context, token)
  revalidatePath("/", "layout")
  redirect("/")
}

export async function getCurrentUser() {
  const context = getRequestContext()
  const token = getSessionToken(env.betterAuth.sessionCookieName)
  const session = await auth.getSession(token, context)
  if (!session.success || !session.data) return null
  return session.data.user
}

export async function getUserProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
  })

  return profile
}

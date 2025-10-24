"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/types/database"

type UserProfile = Database["public"]["Tables"]["users"]["Update"]
type UserEducation = Database["public"]["Tables"]["user_education"]["Insert"]
type UserExperience = Database["public"]["Tables"]["user_experience"]["Insert"]
type UserSkill = Database["public"]["Tables"]["user_skills"]["Insert"]

export async function updateUserProfile(data: UserProfile) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("users").update(data).eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function addEducation(data: Omit<UserEducation, "user_id">) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("user_education").insert({ ...data, user_id: user.id })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updateEducation(id: string, data: Partial<UserEducation>) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_education").update(data).eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteEducation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_education").delete().eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function addExperience(data: Omit<UserExperience, "user_id">) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("user_experience").insert({ ...data, user_id: user.id })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updateExperience(id: string, data: Partial<UserExperience>) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_experience").update(data).eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteExperience(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_experience").delete().eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function addSkill(data: Omit<UserSkill, "user_id">) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("user_skills").insert({ ...data, user_id: user.id })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function deleteSkill(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_skills").delete().eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

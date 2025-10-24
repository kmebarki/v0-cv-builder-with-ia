"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createCVFromTemplate(templateId: string, cvName: string, cvDescription?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  // Get template structure
  const { data: template, error: templateError } = await supabase
    .from("cv_templates")
    .select("template_structure")
    .eq("id", templateId)
    .single()

  if (templateError || !template) {
    return { error: "Template introuvable" }
  }

  // Create new CV from template
  const { data: newCV, error: cvError } = await supabase
    .from("user_cvs")
    .insert({
      user_id: user.id,
      template_id: templateId,
      cv_name: cvName,
      cv_description: cvDescription || null,
      cv_structure: template.template_structure,
      is_default: false,
      is_public: false,
    })
    .select()
    .single()

  if (cvError) {
    return { error: cvError.message }
  }

  revalidatePath("/my-cvs")
  return { success: true, cvId: newCV.id }
}

export async function deleteCv(cvId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("user_cvs").delete().eq("id", cvId).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/my-cvs")
  return { success: true }
}

export async function updateCvMetadata(cvId: string, data: { cv_name?: string; cv_description?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase.from("user_cvs").update(data).eq("id", cvId).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/my-cvs")
  return { success: true }
}

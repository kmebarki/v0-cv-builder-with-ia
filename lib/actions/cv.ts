"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveCVStructure(cvId: string, structure: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Non authentifié")
  }

  const { error } = await supabase
    .from("user_cvs")
    .update({
      cv_structure: JSON.parse(structure),
      updated_at: new Date().toISOString(),
    })
    .eq("id", cvId)
    .eq("user_id", user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/editor/${cvId}`)
}

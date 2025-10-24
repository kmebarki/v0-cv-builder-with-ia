import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CVEditor } from "@/components/editor/cv-editor"
import { saveCVStructure } from "@/lib/actions/cv"

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: cv, error: cvError } = await supabase
    .from("user_cvs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (cvError || !cv) {
    redirect("/my-cvs")
  }

  const handleSave = async (structure: string) => {
    "use server"
    await saveCVStructure(id, structure)
  }

  return <CVEditor cvId={cv.id} cvName={cv.cv_name} initialStructure={cv.cv_structure} onSave={handleSave} />
}

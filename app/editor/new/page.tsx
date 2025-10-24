import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NewCVForm } from "@/components/editor/new-cv-form"

export default async function NewCVPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const templateId = params.template

  if (!templateId) {
    redirect("/templates")
  }

  const { data: template } = await supabase.from("cv_templates").select("*").eq("id", templateId).single()

  if (!template) {
    redirect("/templates")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <NewCVForm template={template} />
    </div>
  )
}

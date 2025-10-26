import { redirect } from "next/navigation"
import AdminFieldAdmin from "@/components/admin/admin-field-admin"
import { requireSession } from "@/lib/auth/session"
import { auth } from "@/lib/auth/server"
import { listAdminFieldDefinitions } from "@/lib/editor/admin-fields"

export default async function AdminFieldsPage() {
  const session = await requireSession()
  if (!session) {
    redirect("/auth/login")
  }

  const permissions = await auth.requireRole(session.user.id, ["admin"])
  if (!permissions.success) {
    redirect("/dashboard")
  }

  const initialData = await listAdminFieldDefinitions({ page: 1, pageSize: 20 })

  return (
    <div className="container mx-auto space-y-6 py-10">
      <AdminFieldAdmin initialData={initialData} />
    </div>
  )
}

import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <p className="text-sm text-muted-foreground">Lien invalide, veuillez redemander une réinitialisation.</p>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}

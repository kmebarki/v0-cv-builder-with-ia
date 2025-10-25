import { auth } from "@/lib/auth/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  let message = "Nous avons envoyé un lien de vérification à votre adresse email."
  let status: "info" | "success" | "error" = "info"

  if (token) {
    const result = await auth.verifyEmail(token)
    if (result.success) {
      message = "Votre email est vérifié ! Vous pouvez maintenant vous connecter."
      status = "success"
    } else {
      message = result.error ?? "Le lien de vérification est invalide ou expiré."
      status = "error"
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Vérification d'email</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {status === "success" ? (
              <Button asChild className="w-full">
                <Link href="/auth/login">Se connecter</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/login">Retour à la connexion</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
